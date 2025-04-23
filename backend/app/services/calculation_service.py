# -*- coding: utf-8 -*-
"""
Calculation Service – 2025‑04‑18
* Ortak hesaplama mantığını tranche_utils.py'den kullanarak yeniden düzenlenmiş
* Class B kupon oranı hesaplama optimization ve calculation servisleri arasında uyumlu
"""

from typing import List, Dict, Any
import io
import pandas as pd
import numpy as np

from app.models.input_models import CalculationRequest
from app.models.output_models import CalculationResult
from app.utils.tranche_utils import calculate_tranche_results

# --------------------------------------------------------------------------- #
#                               FILE LOADER                                   #
# --------------------------------------------------------------------------- #
def load_excel_data(contents: bytes) -> pd.DataFrame:
    """Excel dosyasını okuyup minimum temizliği yapar."""
    try:
        df = pd.read_excel(io.BytesIO(contents))
        df.rename(columns={"Copyinstallment_date": "installment_date"},
                  inplace=True, errors="ignore")
        df["installment_date"] = pd.to_datetime(
            df["installment_date"], dayfirst=True, errors="coerce"
        )

        required = {"principal_amount", "interest_amount"}
        if not required.issubset(df.columns):
            raise ValueError(f"Missing columns: {required - set(df.columns)}")

        df["cash_flow"] = df["principal_amount"] + df["interest_amount"]
        df["original_cash_flow"] = df["cash_flow"].copy()
        return df

    except Exception as exc:
        raise ValueError(f"Excel processing error: {exc}") from exc


# --------------------------------------------------------------------------- #
#                             MAIN CALCULATION                                #
# --------------------------------------------------------------------------- #
def perform_calculation(df: pd.DataFrame,
                        request: CalculationRequest) -> CalculationResult:
    """ABS nakit‑akışı hesabı - ortak tranche_utils mantığını kullanır"""

    # --------------------------- GENEL VERİLER ------------------------------ #
    start_date = pd.Timestamp(request.general_settings.start_date)
    ops_exp = request.general_settings.operational_expenses

    # ---------------------------- TRANCHE A -------------------------------- #
    a_maturities = [t.maturity_days for t in request.tranches_a]
    a_base_rates = [t.base_rate for t in request.tranches_a]
    a_spreads = [t.spread for t in request.tranches_a]
    a_reinvest_rates = [t.reinvest_rate for t in request.tranches_a]
    a_nominals = [round(t.nominal / 1_000) * 1_000 for t in request.tranches_a]

    # ---------------------------- TRANCHE B -------------------------------- #
    # ① nominal: optimize geldiyse kullan, yoksa %5 kuralı
    if request.tranche_b.nominal and request.tranche_b.nominal > 0:
        b_nominal = request.tranche_b.nominal
    else:
        percent_b = 5
        total_a = sum(a_nominals)
        b_nominal = (total_a * percent_b) / (100 - percent_b)
        b_nominal = round(b_nominal / 1_000) * 1_000

    b_nominal = max(1_000, round(b_nominal / 1_000) * 1_000)

    # ② diğer B parametreleri
    raw_b_day = request.tranche_b.maturity_days
    b_maturity = min(365, max(1, raw_b_day))          # 1‑365 sınırı
    b_base_rate = request.tranche_b.base_rate
    b_spread = request.tranche_b.spread
    b_reinvest_rate = request.tranche_b.reinvest_rate

    # ----------------------- ORTAK HESAPLAMA MODÜLÜ KULLAN ---------------- #
    results = calculate_tranche_results(
        df, start_date,
        a_maturities, a_base_rates, a_spreads, a_reinvest_rates, a_nominals,
        b_maturity, b_base_rate, b_spread, b_reinvest_rate, b_nominal,
        ops_exp
    )

    # Sonuçları çıktı formatına dönüştür
    return CalculationResult(
        class_a_total=results['class_a_total'],
        class_b_total=results['class_b_total'],
        class_a_principal=results['class_a_principal'],
        class_b_principal=results['class_b_principal'],
        class_a_interest=results['class_a_interest'],
        class_b_coupon=results['class_b_coupon'],
        min_buffer_actual=results['min_buffer_actual'],
        total_principal_paid=results['total_principal_paid'],
        total_loan_principal=results['total_loan_principal'],
        financing_cost=results['financing_cost'],
        tranche_results=results['tranche_results'],
        interest_rate_conversions=results['interest_rate_conversions'],
    )