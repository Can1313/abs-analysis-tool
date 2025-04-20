import pandas as pd
import numpy as np
from datetime import date, datetime
from app.utils.tranche_utils import calculate_tranche_results
from typing import Dict, Any, List, Union
from app.models.input_models import StressTestRequest
import logging
import traceback

logger = logging.getLogger(__name__)

def ensure_timestamp(date_input: Union[str, date, datetime, pd.Timestamp]) -> pd.Timestamp:
    """
    Herhangi bir tarih formatını pandas Timestamp'e çevirir
    
    Args:
        date_input: str, date, datetime, pd.Timestamp olabilir
        
    Returns:
        pd.Timestamp: Çevrilmiş tarih
    """
    if isinstance(date_input, pd.Timestamp):
        return date_input
    
    if isinstance(date_input, (date, datetime)):
        return pd.Timestamp(date_input)
    
    if isinstance(date_input, str):
        try:
            return pd.Timestamp(date_input)
        except Exception as e:
            logger.error(f"Tarih formatı çevrilemedi: {date_input}, hata: {str(e)}")
            # Varsayılan olarak bugünün tarihini dön
            return pd.Timestamp('today')
    
    # Diğer tip değerler için 
    logger.warning(f"Beklenmeyen tarih formatı: {type(date_input)}, değer: {date_input}")
    return pd.Timestamp('today')

def adjust_cash_flow_for_npl(df: pd.DataFrame, npl_rate: float) -> pd.DataFrame:
    """
    Nakit akışlarını NPL oranına göre azaltır
    
    Args:
        df: Nakit akışı DataFrame'i
        npl_rate: NPL oranı (% olarak)
        
    Returns:
        pd.DataFrame: Düzeltilmiş nakit akışları
    """
    try:
        # Sütunların var olduğunu kontrol et
        required_columns = ['principal_amount', 'interest_amount', 'cash_flow']
        for col in required_columns:
            if col not in df.columns:
                logger.error(f"Eksik sütun: '{col}'")
                raise ValueError(f"Veri içinde '{col}' sütunu bulunamadı")
        
        # Verinin kopyasını al
        df_adjusted = df.copy()
        
        # NPL oranını faktöre çevir (örn. 5% -> 0.05)
        npl_factor = npl_rate / 100.0
        
        # Anapara ödemelerini NPL oranına göre azalt
        df_adjusted['principal_amount'] = df_adjusted['principal_amount'] * (1 - npl_factor)
        
        # Toplam nakit akışını yeniden hesapla
        df_adjusted['cash_flow'] = df_adjusted['principal_amount'] + df_adjusted['interest_amount']
        
        # Orijinal nakit akışını referans olarak sakla
        if 'original_cash_flow' not in df_adjusted.columns:
            df_adjusted['original_cash_flow'] = df['cash_flow'].copy()
        
        logger.info(f"NPL oranı %{npl_rate} uygulandı, anapara ödemeleri azaltıldı")
        return df_adjusted
        
    except Exception as e:
        logger.error(f"NPL için nakit akışı düzenleme hatası: {str(e)}")
        logger.debug(traceback.format_exc())
        raise ValueError(f"NPL oranı için nakit akışı düzenlenemedi: {str(e)}")

def adjust_cash_flow_for_prepayment(df: pd.DataFrame, prepayment_rate: float) -> pd.DataFrame:
    """
    Nakit akışlarını erken ödeme oranına göre düzenler
    
    Args:
        df: Nakit akışı DataFrame'i
        prepayment_rate: Erken ödeme oranı (% olarak)
        
    Returns:
        pd.DataFrame: Düzeltilmiş nakit akışları
    """
    try:
        # Erken ödeme oranı sıfır veya negatifse düzenleme yapma
        if prepayment_rate <= 0:
            return df.copy()
        
        # Sütunların var olduğunu kontrol et
        required_columns = ['principal_amount', 'installment_date']
        for col in required_columns:
            if col not in df.columns:
                logger.error(f"Eksik sütun: '{col}'")
                raise ValueError(f"Veri içinde '{col}' sütunu bulunamadı")
        
        # Verinin kopyasını al
        df_adjusted = df.copy()
        
        # Erken ödeme oranını faktöre çevir (örn. 30% -> 0.3)
        prepayment_factor = prepayment_rate / 100.0
        
        # Tarihe göre sırala
        if not pd.api.types.is_datetime64_any_dtype(df_adjusted['installment_date']):
            logger.info("installment_date sütunu datetime'a çevriliyor")
            df_adjusted['installment_date'] = pd.to_datetime(df_adjusted['installment_date'], errors='coerce')
        
        # Hata kontrolü - geçersiz tarihler
        if df_adjusted['installment_date'].isna().any():
            logger.warning("Bazı installment_date değerleri geçersiz, bunlar analize dahil edilmeyecek")
            df_adjusted = df_adjusted.dropna(subset=['installment_date'])
        
        # Tarihe göre sırala
        df_adjusted = df_adjusted.sort_values('installment_date')
        
        # Toplam anaparayı hesapla
        total_principal = df_adjusted['principal_amount'].sum()
        if total_principal <= 0:
            logger.warning("Toplam anapara sıfır veya negatif, erken ödeme düzenlemesi yapılamıyor")
            return df_adjusted
        
        # Erken ödeme miktarını hesapla
        prepayment_amount = total_principal * prepayment_factor
        
        # Satır sayısını kontrol et
        n_rows = len(df_adjusted)
        if n_rows <= 1:
            logger.warning("Erken ödeme düzenlemesi için çok az satır var")
            return df_adjusted
        
        # Erken ödeme dağıtım fonksiyonu (erken dönemlerde daha fazla)
        prepayment_weights = np.linspace(3, 1, n_rows)
        prepayment_weights = prepayment_weights / prepayment_weights.sum()
        
        # Erken ödemeleri ağırlıklara göre dağıt
        prepayment_allocations = prepayment_amount * prepayment_weights
        
        # İndeksleri belirle
        mid_point = n_rows // 2
        reduction_indices = range(mid_point, n_rows)  # İkinci yarıyı azalt
        addition_indices = range(0, mid_point)        # İlk yarıyı arttır
        
        # Geç dönem ödemelerini azalt
        df_temp = df_adjusted.copy()
        for i in reduction_indices:
            if i < len(prepayment_allocations):
                max_reduction = df_temp.iloc[i]['principal_amount'] * 0.8
                reduction = min(prepayment_allocations[i], max_reduction)
                df_temp.iloc[i, df_temp.columns.get_loc('principal_amount')] -= reduction
        
        # Erken dönem ödemelerini arttır
        for i in addition_indices:
            if i < len(prepayment_allocations):
                df_temp.iloc[i, df_temp.columns.get_loc('principal_amount')] += prepayment_allocations[i]
        
        # Düzenlenmiş DataFrame'i güncelle
        df_adjusted = df_temp
        
        # Toplam nakit akışını yeniden hesapla
        if 'interest_amount' in df_adjusted.columns:
            df_adjusted['cash_flow'] = df_adjusted['principal_amount'] + df_adjusted['interest_amount']
        
        # Orijinal nakit akışını referans olarak sakla
        if 'original_cash_flow' not in df_adjusted.columns and 'cash_flow' in df.columns:
            df_adjusted['original_cash_flow'] = df['cash_flow'].copy()
        
        logger.info(f"Erken ödeme oranı %{prepayment_rate} uygulandı, anapara ödemeleri kaydırıldı")
        return df_adjusted
        
    except Exception as e:
        logger.error(f"Erken ödeme için nakit akışı düzenleme hatası: {str(e)}")
        logger.debug(traceback.format_exc())
        raise ValueError(f"Erken ödeme oranı için nakit akışı düzenlenemedi: {str(e)}")

def perform_stress_test(df: pd.DataFrame, request: StressTestRequest) -> Dict[str, Any]:
    """
    Nakit akışlarını stres senaryosuna göre düzenleyerek yeniden hesaplar
    
    Args:
        df: Nakit akışı DataFrame'i
        request: Stres test parametreleri
        
    Returns:
        Dict[str, Any]: Stres test sonuçları
    """
    try:
        logger.info("Stres testi hesaplaması başlatılıyor")
        
        # Temel parametreleri çıkar
        structure = request.structure
        scenario = request.scenario
        npl_rate = scenario.npl_rate
        prepayment_rate = scenario.prepayment_rate
        reinvestment_shift = scenario.reinvestment_shift
        
        # Parametreleri logla
        logger.info(f"Senaryo: {scenario.name}")
        logger.info(f"NPL Oranı: %{npl_rate}, Erken Ödeme: %{prepayment_rate}, Yeniden Yatırım Değişimi: %{reinvestment_shift}")
        
        # SORUN ÇÖZÜMÜ: start_date'i pandas Timestamp'e çevir
        # Bu, "Cannot compare Timestamp with datetime.date" hatasını çözer
        start_date = ensure_timestamp(structure.start_date)
        logger.info(f"Başlangıç tarihi: {start_date}")
        
        # Veri kontrolü
        if df is None or df.empty:
            raise ValueError("Analiz için geçerli nakit akışı verisi bulunamadı")
        
        # Sütunların var olduğunu kontrol et
        required_columns = ['principal_amount', 'interest_amount', 'cash_flow', 'installment_date']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Nakit akışı verisinde eksik sütunlar: {', '.join(missing_columns)}")
        
        # Önce orijinal veriyle temel sonuçları hesapla
        logger.info("Temel sonuçlar hesaplanıyor")
        try:
            baseline_result = calculate_tranche_results(
                df, start_date,
                structure.a_maturities, structure.a_base_rates, structure.a_spreads, structure.a_reinvest_rates,
                structure.a_nominals, structure.b_maturity, structure.b_base_rate, structure.b_spread,
                structure.b_reinvest_rate, structure.b_nominal, structure.ops_expenses
            )
        except Exception as e:
            logger.error(f"Temel hesaplama hatası: {str(e)}")
            logger.debug(traceback.format_exc())
            raise ValueError(f"Temel senaryo hesaplanırken hata oluştu: {str(e)}")
        
        # NPL oranını uygula
        df_adjusted = df.copy()
        if npl_rate > 0:
            logger.info(f"NPL oranı %{npl_rate} uygulanıyor")
            df_adjusted = adjust_cash_flow_for_npl(df_adjusted, npl_rate)
        
        # Erken ödeme oranını uygula
        if prepayment_rate > 0:
            logger.info(f"Erken ödeme oranı %{prepayment_rate} uygulanıyor")
            df_adjusted = adjust_cash_flow_for_prepayment(df_adjusted, prepayment_rate)
        
        # Yeniden yatırım oranlarını değiştir (varsa)
        a_reinvest_rates = list(structure.a_reinvest_rates)  # Listenin kopyasını al
        b_reinvest_rate = structure.b_reinvest_rate
        
        if reinvestment_shift != 0:
            logger.info(f"Yeniden yatırım oranlarına %{reinvestment_shift} değişim uygulanıyor")
            a_reinvest_rates = [rate + reinvestment_shift for rate in structure.a_reinvest_rates]
            b_reinvest_rate = structure.b_reinvest_rate + reinvestment_shift
        
        # Stres test sonuçlarını hesapla
        logger.info("Stres test sonuçları hesaplanıyor")
        try:
            result = calculate_tranche_results(
                df_adjusted, start_date,
                structure.a_maturities, structure.a_base_rates, structure.a_spreads, a_reinvest_rates,
                structure.a_nominals, structure.b_maturity, structure.b_base_rate, structure.b_spread,
                b_reinvest_rate, structure.b_nominal, structure.ops_expenses
            )
        except Exception as e:
            logger.error(f"Stres testi hesaplama hatası: {str(e)}")
            logger.debug(traceback.format_exc())
            raise ValueError(f"Stres senaryosu hesaplanırken hata oluştu: {str(e)}")
        
        # Sonuç değerlerini al
        baseline_coupon_rate = baseline_result.get('effective_coupon_rate', 0)
        stress_coupon_rate = result.get('effective_coupon_rate', 0)
        baseline_buffer = baseline_result.get('min_buffer_actual', 0)
        stress_buffer = result.get('min_buffer_actual', 0)
        
        # Cevap objesi oluştur
        response = {
            'baseline': {
                'class_b_coupon_rate': round(baseline_coupon_rate, 4),
                'min_buffer_actual': round(baseline_buffer, 4)
            },
            'stress_test': {
                'class_b_coupon_rate': round(stress_coupon_rate, 4),
                'min_buffer_actual': round(stress_buffer, 4),
                'npl_rate': npl_rate,
                'prepayment_rate': prepayment_rate,
                'reinvestment_shift': reinvestment_shift
            },
            'difference': {
                'class_b_coupon_rate': round(stress_coupon_rate - baseline_coupon_rate, 4),
                'min_buffer_actual': round(stress_buffer - baseline_buffer, 4)
            }
        }
        
        # Sonuçları logla
        logger.info("Stres testi başarıyla tamamlandı")
        logger.info(f"Temel senaryo oranı: %{response['baseline']['class_b_coupon_rate']}, " +
                   f"Stres senaryosu oranı: %{response['stress_test']['class_b_coupon_rate']}")
        logger.info(f"Fark: %{response['difference']['class_b_coupon_rate']}")
        
        return response
        
    except Exception as e:
        # Detaylı hata mesajını logla
        logger.error(f"Stres testi sırasında beklenmeyen hata: {str(e)}")
        logger.debug(traceback.format_exc())
        raise ValueError(f"Stres testi hesaplaması başarısız oldu: {str(e)}")