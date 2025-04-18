# backend/app/utils/tranche_utils.py
"""
Optimization ve Calculation servisleri arasında ortak hesaplama
fonksiyonlarını içeren utility modülü.
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from app.utils.finance_utils import (
    simple_to_compound_annual,
    get_nearest_maturity
)
from app.utils.cash_flow_utils import (
    assign_cash_flows_to_tranches,
    calculate_totals
)

def calculate_tranche_results(
    df: pd.DataFrame,
    start_date: pd.Timestamp,
    a_maturities: List[int],
    a_base_rates: List[float],
    a_spreads: List[float],
    a_reinvest_rates: List[float],
    a_nominals: List[float],
    b_maturity: int,
    b_base_rate: float,
    b_spread: float,
    b_reinvest_rate: float,
    b_nominal: float,
    ops_expenses: float = 0.0
) -> Dict[str, Any]:
    """
    Hem optimization hem de calculation servislerinde kullanılacak
    ortak tranche hesaplama mantığını içerir.
    
    Args:
        df: Nakit akışı verileri içeren DataFrame
        start_date: Başlangıç tarihi
        a_maturities: Class A vadeleri (gün)
        a_base_rates: Class A baz faiz oranları
        a_spreads: Class A spread değerleri
        a_reinvest_rates: Class A yeniden yatırım oranları
        a_nominals: Class A nominal değerleri
        b_maturity: Class B vadesi (gün)
        b_base_rate: Class B baz faiz oranı
        b_spread: Class B spread değeri
        b_reinvest_rate: Class B yeniden yatırım oranı
        b_nominal: Class B nominal değeri
        ops_expenses: Operasyon giderleri
        
    Returns:
        Hesaplanmış sonuçları içeren sözlük
    """
    # Geçici dataframe kopyası
    df_temp = df.copy()
    df_temp["cash_flow"] = df_temp["original_cash_flow"].copy()
    
    # Operasyonel giderleri düş (16 Şubat 2025)
    if ops_expenses > 0:
        target_date = pd.Timestamp("2025-02-16")
        mask = df_temp["installment_date"].dt.date == target_date.date()
        if mask.any():
            idx = df_temp[mask].index[0]
            df_temp.at[idx, "cash_flow"] = max(0, df_temp.at[idx, "cash_flow"] - ops_expenses)
    
    # Tüm parametreleri birleştir
    all_maturity_days = a_maturities + [b_maturity]
    all_base_rates = a_base_rates + [b_base_rate]
    all_spreads = a_spreads + [b_spread]
    all_reinvest_rates = a_reinvest_rates + [b_reinvest_rate]
    all_nominals = a_nominals + [b_nominal]
    all_maturity_dates = [start_date + pd.Timedelta(days=days) for days in all_maturity_days]
    
    # Nakit akışlarını tranchelere dağıt
    tranch_cash_flows = assign_cash_flows_to_tranches(
        df_temp, start_date, all_maturity_dates, all_reinvest_rates
    )
    
    # Tranche sonuçlarını hesapla
    results = []
    buffer = 0.0
    
    for i, days in enumerate(all_maturity_days):
        is_a = i < len(a_maturities)
        t_name = f"Class {'A' if is_a else 'B'}{i+1 if is_a else ''}".strip()
        
        # Nakit akışı, reinvestment ve buffer hesapla
        c_flow, r_ret, total_principal, total_interest = calculate_totals(
            tranch_cash_flows[i], all_maturity_dates[i], all_reinvest_rates[i]
        )
        
        # Buffer faiz getirisi hesapla
        buf_reinv = 0.0
        if i > 0 and buffer > 0 and days > all_maturity_days[i-1]:
            factor = (1 + simple_to_compound_annual(all_reinvest_rates[i])/100)**(
                (days - all_maturity_days[i-1]) / 365
            ) - 1
            buf_reinv = buffer * factor
        
        # Toplam kullanılabilir nakit
        available = c_flow + r_ret + buffer + buf_reinv
        nominal = all_nominals[i]
        
        # Faiz oranı parametreleri
        base_rate = all_base_rates[i]
        spread = all_spreads[i]
        total_rate = base_rate + spread/100
        
        if is_a:
            # Class A için hesaplama
            total_rate = base_rate + spread/100
            disc = 1 / (1 + total_rate/100 * days/365) if days else 1
            principal = nominal * disc
            interest = nominal - principal
            coupon = 0.0
            coupon_rate = 0.0
            eff_coupon = 0.0
            total_pay = nominal
        else:
            # Class B için hesaplama
            principal = max(0.001, nominal)
            coupon = max(0, available - principal)
            interest = 0.0
            coupon_rate = coupon / principal * 100 if principal > 0.001 else 0.0
            eff_coupon = (coupon / principal * 365 / days * 100) if principal > 0.001 and days > 0 else 0.0
            total_pay = principal + coupon
        
        # Buffer hesapla
        new_buffer = max(0.0, available - total_pay)
        buf_ratio = new_buffer / nominal * 100 if nominal else 0.0
        
        # Sonuçları ekle
        results.append({
            "Tranche": t_name,
            "Start Date": start_date.strftime("%d/%m/%Y"),
            "Maturity Days": days,
            "Maturity Date": all_maturity_dates[i].strftime("%d/%m/%Y"),
            "Base Rate (%)": all_base_rates[i],
            "Spread (bps)": all_spreads[i],
            "Total Interest Rate (%)": total_rate,
            "Coupon Rate (%)": coupon_rate,
            "Effective Coupon (%)": eff_coupon,
            "Original Nominal": nominal,
            "Adjusted Nominal": nominal,
            "Buffer In": buffer,
            "Cash Flow Total": c_flow,
            "Reinvestment Return": r_ret,
            "Buffer Reinvestment": buf_reinv,
            "Total Available": available,
            "Principal": principal,
            "Interest": interest,
            "Coupon Payment": coupon,
            "Nominal Payment": nominal,
            "Total Payment": total_pay,
            "Buffer Out": new_buffer,
            "Buffer Cash Flow Ratio (%)": buf_ratio,
            "Discount Factor": 1.0,
            "Is Class A": is_a,
        })
        
        # Buffer güncelle
        buffer = new_buffer
    
    # Sonuçları Class A ve B olarak ayır
    a_results = [r for r in results if r["Is Class A"]]
    b_results = [r for r in results if not r["Is Class A"]]
    
    # Toplamaları hesapla
    class_a_principal = sum(r["Principal"] for r in a_results)
    class_b_principal = sum(r["Principal"] for r in b_results)
    class_a_interest = sum(r["Interest"] for r in a_results)
    class_b_coupon = sum(r["Coupon Payment"] for r in b_results)
    class_a_total = sum(r["Total Payment"] for r in a_results)
    class_b_total = sum(r["Total Payment"] for r in b_results)
    
    # En düşük buffer oranı
    min_buffer_actual = min(r["Buffer Cash Flow Ratio (%)"] for r in a_results) if a_results else 0.0
    
    # Toplam ödenen ve finans maliyeti
    total_principal_paid = class_a_principal + class_b_principal
    total_loan_principal = df_temp["principal_amount"].sum()
    financing_cost = total_principal_paid - total_loan_principal
    
    # Faiz oranı dönüşüm bilgileri
    rate_conversions = []
    for i, days in enumerate(all_maturity_days):
        is_a = i < len(a_maturities)
        t_name = f"Class {'A' if is_a else 'B'}{i+1 if is_a else ''}".strip()
        
        if is_a:
            # Class A tranches için
            total_rate = all_base_rates[i] + all_spreads[i]/100
            simple_annual = total_rate
            compound_for_period = simple_to_maturity_compound(total_rate, days)
            reinvest_simple = all_reinvest_rates[i]
            reinvest_compound = overnight_to_annual_compound(all_reinvest_rates[i])
            coupon_rate = "-"
            eff_coupon_rate = "-"
        else:
            # Class B tranches için
            coupon_rate = results[i]["Coupon Rate (%)"]
            eff_coupon_rate = results[i]["Effective Coupon (%)"]
            simple_annual = "-"
            compound_for_period = "-"
            reinvest_simple = all_reinvest_rates[i]
            reinvest_compound = overnight_to_annual_compound(all_reinvest_rates[i])
        
        rate_conversions.append({
            "Tranche": t_name,
            "Maturity Days": days,
            "Simple Annual Interest (%)": simple_annual,
            "Compound Interest for Period (%)": compound_for_period,
            "Reinvest Simple Annual (%)": reinvest_simple,
            "Reinvest O/N Compound (%)": reinvest_compound,
            "Coupon Rate (%)": coupon_rate,
            "Effective Coupon Rate (%)": eff_coupon_rate,
        })
    
    # Doğrudan kupon oranı ve efektif kupon oranı
    direct_coupon_rate = results[-1]["Coupon Rate (%)"] if b_results else 0.0
    effective_coupon_rate = results[-1]["Effective Coupon (%)"] if b_results else 0.0
    
    # Sonuçları döndür
    return {
        "tranche_results": results,
        "interest_rate_conversions": rate_conversions,
        "class_a_total": class_a_total,
        "class_b_total": class_b_total,
        "class_a_principal": class_a_principal,
        "class_b_principal": class_b_principal,
        "class_a_interest": class_a_interest,
        "class_b_coupon": class_b_coupon,
        "min_buffer_actual": min_buffer_actual,
        "total_principal_paid": total_principal_paid,
        "total_loan_principal": total_loan_principal,
        "financing_cost": financing_cost,
        "direct_coupon_rate": direct_coupon_rate,
        "effective_coupon_rate": effective_coupon_rate
    }

def simple_to_maturity_compound(simple_rate_percent, days):
    """Convert a simple rate over 'days' to an equivalent annual compounded rate."""
    if days <= 0:
        return 0.0
    r_simple = simple_rate_percent / 100.0
    period_simple = r_simple * (days / 365)  # portion of the year
    period_compound = (1 + period_simple)**(365 / days) - 1
    return period_compound * 100.0

def overnight_to_annual_compound(simple_rate_percent):
    """Convert an annual simple rate to annual compound."""
    daily_rate = simple_rate_percent / 365 / 100
    annual_compound = (1 + daily_rate)**365 - 1
    return annual_compound * 100.0

def adjust_class_a_nominals_for_target_coupon(
    df: pd.DataFrame,
    start_date: pd.Timestamp,
    a_maturities: List[int],
    a_nominals: List[float],
    a_base_rates: List[float],
    a_spreads: List[float],
    a_reinvest_rates: List[float],
    b_maturity: int,
    b_base_rate: float,
    b_spread: float,
    b_reinvest_rate: float,
    class_b_nominal: float,
    target_class_b_coupon_rate: float,
    target_class_b_percent: float,
    min_buffer: float,
    ops_expenses: float = 0.0,
    max_allowed_diff: float = 0.5,
    class_b_percent_deviation: float = 1.0,
    max_iterations: int = 30
) -> Tuple[List[float], bool, float]:
    """
    Class A nominal miktarlarını hedef Class B kupon oranına ulaşacak şekilde
    ayarlar. Bu fonksiyon optimize ve hesaplama servisleri arasında tutarlılık sağlar.
    
    Args:
        df: Nakit akışı verileri içeren DataFrame
        start_date: Başlangıç tarihi
        a_maturities: Class A vadeleri (gün)
        a_nominals: Class A nominal değerleri (başlangıç değerleri)
        a_base_rates: Class A baz faiz oranları
        a_spreads: Class A spread değerleri
        a_reinvest_rates: Class A yeniden yatırım oranları
        b_maturity: Class B vadesi (gün)
        b_base_rate: Class B baz faiz oranı
        b_spread: Class B spread değeri
        b_reinvest_rate: Class B yeniden yatırım oranı
        class_b_nominal: Class B nominal değeri
        target_class_b_coupon_rate: Hedef Class B kupon oranı
        target_class_b_percent: Hedef Class B yüzdesi
        min_buffer: Minimum buffer gereksinimi
        ops_expenses: Operasyon giderleri
        max_allowed_diff: İzin verilen maksimum fark
        class_b_percent_deviation: İzin verilen Class B yüzde sapması
        max_iterations: Maksimum iterasyon sayısı
        
    Returns:
        (ayarlanmış_nominal_listesi, başarı_bayrağı, gerçek_class_b_yüzdesi)
    """
    # Başlangıç parametreleri
    original_a_total = sum(a_nominals)
    original_proportions = [n / original_a_total for n in a_nominals]
    
    # Nominal kısıtlamaları
    min_adjustment = 0.001  # Orijinalin %0.1'ine kadar düşebilir
    max_adjustment = 3.0    # Orijinalin 3 katına kadar çıkabilir
    
    # Sınırları kontrol et
    b_maturity = max(1, min(365, b_maturity))
    
    # Class B yüzde hesapla
    total_nominal = original_a_total + class_b_nominal
    actual_class_b_percent = (class_b_nominal / total_nominal) * 100
    
    # İlk değerlendirme
    result = calculate_tranche_results(
        df, start_date,
        a_maturities, a_base_rates, a_spreads, a_reinvest_rates, a_nominals,
        b_maturity, b_base_rate, b_spread, b_reinvest_rate, class_b_nominal,
        ops_expenses
    )
    
    baseline_coupon_rate = result['effective_coupon_rate']
    baseline_min_buffer = result['min_buffer_actual']
    baseline_direct_rate = result['direct_coupon_rate']
    
    # İlk düzeltme yaklaşımı
    if baseline_coupon_rate > 0:
        direct_adjustment = target_class_b_coupon_rate / baseline_coupon_rate
        direct_adjustment = max(min_adjustment, min(max_adjustment, direct_adjustment))
        
        test_nominals = [original_proportions[i] * original_a_total * direct_adjustment 
                       for i in range(len(a_nominals))]
        
        test_nominals = [max(1000, round(n / 1000) * 1000) for n in test_nominals]
        
        # Düzeltilmiş değerleri test et
        test_result = calculate_tranche_results(
            df, start_date,
            a_maturities, a_base_rates, a_spreads, a_reinvest_rates, test_nominals,
            b_maturity, b_base_rate, b_spread, b_reinvest_rate, class_b_nominal,
            ops_expenses
        )
        
        direct_coupon_rate = test_result['effective_coupon_rate']
        direct_min_buffer = test_result['min_buffer_actual']
        
        # Recalculate actual Class B percentage with adjusted Class A
        test_a_total = sum(test_nominals)
        test_total_nominal = test_a_total + class_b_nominal
        test_class_b_percent = (class_b_nominal / test_total_nominal) * 100
        
        # Check if Class B percentage is within allowed range
        min_class_b_percent = max(0.1, target_class_b_percent - class_b_percent_deviation)
        max_class_b_percent = min(50, target_class_b_percent + class_b_percent_deviation)
        is_class_b_percent_valid = min_class_b_percent <= test_class_b_percent <= max_class_b_percent
        
        # Doğrudan yaklaşım yeterince iyiyse kullan
        if direct_min_buffer >= min_buffer and abs(direct_coupon_rate - target_class_b_coupon_rate) <= max_allowed_diff and is_class_b_percent_valid:
            return test_nominals, True, test_class_b_percent
        
        # Başlangıç ​​değerini ayarla
        current_adjustment = direct_adjustment
        adjustment_direction = 1 if direct_coupon_rate < target_class_b_coupon_rate else -1
    else:
        current_adjustment = 1.0
        adjustment_direction = 0  # Nötr başla
    
    # Başlangıç yönünü belirle (direct_approach tarafından belirlenmemişse)
    if baseline_coupon_rate < target_class_b_coupon_rate and adjustment_direction == 0:
        adjustment_direction = 1  # Arttır
        current_adjustment = 1.2  # %20 artışla başla
    elif baseline_coupon_rate > target_class_b_coupon_rate and adjustment_direction == 0:
        adjustment_direction = -1  # Azalt
        
        # Hedeften uzaklığa göre agresif ayarlama
        coupon_ratio = baseline_coupon_rate / target_class_b_coupon_rate
        if coupon_ratio > 10:
            current_adjustment = 0.01  # Orijinal boyutun %1'i
        elif coupon_ratio > 5:
            current_adjustment = 0.05  # Orijinal boyutun %5'i
        elif coupon_ratio > 2:
            current_adjustment = 0.1   # Orijinal boyutun %10'u
        else:
            current_adjustment = 0.5   # Orijinal boyutun %50'si
    
    best_diff = float('inf')
    best_nominals = a_nominals.copy()
    best_class_b_percent = actual_class_b_percent
    success = False
    
    # Önceki sonuçlar (enterpolasyon için)
    last_adjustment = current_adjustment
    last_coupon_rate = baseline_coupon_rate
    
    # İyileştirilmiş adaptif arama döngüsü
    for iteration in range(max_iterations):
        # Mevcut ayarlama faktörünü uygula
        current_nominals = [original_proportions[i] * original_a_total * current_adjustment 
                           for i in range(len(a_nominals))]
        
        # 1000'e yuvarla ve sıfır olmamasını sağla
        current_nominals = [max(1000, round(n / 1000) * 1000) for n in current_nominals]
        
        # Mevcut ayarlamayı değerlendir
        result = calculate_tranche_results(
            df, start_date,
            a_maturities, a_base_rates, a_spreads, a_reinvest_rates, current_nominals,
            b_maturity, b_base_rate, b_spread, b_reinvest_rate, class_b_nominal,
            ops_expenses
        )
        
        coupon_rate = result['effective_coupon_rate']
        min_buffer_actual = result['min_buffer_actual']
        
        # Calculate difference from target
        rate_diff = abs(coupon_rate - target_class_b_coupon_rate)
        
        # Calculate actual Class B percentage
        current_a_total = sum(current_nominals)
        current_total_nominal = current_a_total + class_b_nominal
        current_class_b_percent = (class_b_nominal / current_total_nominal) * 100
        percent_diff = abs(current_class_b_percent - target_class_b_percent)
        
        # Check if Class B percentage is within allowed range
        is_class_b_percent_valid = min_class_b_percent <= current_class_b_percent <= max_class_b_percent
        
        # Bu sonuç daha iyiyse ve buffer gereksinimini karşılıyorsa kaydet
        if min_buffer_actual >= min_buffer and is_class_b_percent_valid and rate_diff < best_diff:
            best_diff = rate_diff
            best_nominals = current_nominals.copy()
            best_class_b_percent = current_class_b_percent
            
            # Hedefe yakınsak, başarı olarak kabul et
            if rate_diff <= max_allowed_diff:
                success = True
                
                # Hedefe çok yakınsa, erken çık
                if rate_diff < 0.1:
                    break
        
        # Linear enterpolasyon ile daha iyi tahmin
        if iteration > 0 and last_coupon_rate != coupon_rate:
            if abs(current_adjustment - last_adjustment) > 0.000001:
                # Oran değişimi eğimini hesapla
                rate_slope = (coupon_rate - last_coupon_rate) / (current_adjustment - last_adjustment)
                
                if abs(rate_slope) > 0.001:  # Sıfıra bölünmeyi önle
                    # Hedefi vurmak için gereken tahmini ayarlama
                    estimated_adjustment = last_adjustment + (target_class_b_coupon_rate - last_coupon_rate) / rate_slope
                    
                    # Makul sınırlar içinde tut
                    next_adjustment = max(min_adjustment, min(max_adjustment, estimated_adjustment))
                    
                    # Sadece çok uç değilse enterpolasyonu kullan
                    if 0.5 * current_adjustment <= next_adjustment <= 2.0 * current_adjustment:
                        # Mevcut değerleri kaydet
                        last_adjustment = current_adjustment
                        last_coupon_rate = coupon_rate
                        
                        # Enterpolasyon sonucu ayarla
                        current_adjustment = next_adjustment
                        continue
        
        # Sonraki enterpolasyon için mevcut değerleri kaydet
        last_adjustment = current_adjustment
        last_coupon_rate = coupon_rate
        
        # Sonuçlara göre adaptif ayarlama
        if coupon_rate < target_class_b_coupon_rate:
            if adjustment_direction == 1:
                # Doğru yöndeyiz (arttırıyoruz), daha agresif ol
                coupon_ratio = target_class_b_coupon_rate / coupon_rate
                current_adjustment *= min(1.5, coupon_ratio)
            else:
                # Çok ileri gittik, yön değiştir ve daha küçük adım
                adjustment_direction = 1
                current_adjustment = 1.0 + (1.0 - current_adjustment) * 0.3
        else:  # coupon_rate > target_class_b_coupon_rate
            if adjustment_direction == -1:
                # Doğru yöndeyiz (azaltıyoruz), daha agresif ol
                coupon_ratio = coupon_rate / target_class_b_coupon_rate
                current_adjustment *= max(0.5, 1/coupon_ratio)
            else:
                # Çok ileri gittik, yön değiştir ve daha küçük adım
                adjustment_direction = -1
                current_adjustment = 1.0 - (current_adjustment - 1.0) * 0.3
        
        # Ayarlamanın sınırlar içinde olduğundan emin ol
        current_adjustment = max(min_adjustment, min(max_adjustment, current_adjustment))
        
        # Çok küçük değişiklikler yapıyorsak ve takılı kaldıysak erken çık
        if abs(current_adjustment - last_adjustment) < 0.001 and iteration > 10:
            break
    
    return best_nominals, success, best_class_b_percent