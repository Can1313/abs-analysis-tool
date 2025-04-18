# -*- coding: utf-8 -*-
"""
Calculation Service – 2025‑04‑18
• Class B nominal:
    – Optimizasyon çıktıysa ⇒ istekte gelen nominal kullanılır
    – Yoksa ⇒ %10.178 kuralıyla hesaplanır
• Class B vade 1‑365 gün arasında sıkıştırılır
• Tüm nominal değerler 1000’e yuvarlanır
"""

from typing import List, Dict, Any
import io
import pandas as pd
import numpy as np

from app.models.input_models import CalculationRequest
from app.models.output_models import CalculationResult
from app.utils.finance_utils import (
    simple_to_compound_annual,
    simple_to_maturity_compound,
    overnight_to_annual_compound,
)
from app.utils.cash_flow_utils import assign_cash_flows_to_tranches, calculate_totals


# --------------------------------------------------------------------------- #
#                               FILE LOADER                                   #
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
#                             MAIN CALCULATION                                #
# --------------------------------------------------------------------------- #
def perform_calculation(df: pd.DataFrame,
                        request: CalculationRequest) -> CalculationResult:
    """ABS nakit‑akışı hesabı"""

    # --------------------------- GENEL VERİLER ------------------------------ #
    start_date = pd.Timestamp(request.general_settings.start_date)
    ops_exp = request.general_settings.operational_expenses

    df_calc = df.copy()
    df_calc["cash_flow"] = df_calc["original_cash_flow"]
    # 16 Şub 2025 satırından operasyonel gideri düş
    mask = df_calc["installment_date"].dt.date == pd.Timestamp("2025‑02‑16").date()
    if mask.any():
        i = df_calc[mask].index[0]
        df_calc.at[i, "cash_flow"] = max(0, df_calc.at[i, "cash_flow"] - ops_exp)

    # ---------------------------- TRANCHE A -------------------------------- #
    A_mats = [t.maturity_days for t in request.tranches_a]
    A_base = [t.base_rate for t in request.tranches_a]
    A_spread = [t.spread for t in request.tranches_a]
    A_reinv = [t.reinvest_rate for t in request.tranches_a]
    A_nom = [round(t.nominal / 1_000) * 1_000 for t in request.tranches_a]

    # ---------------------------- TRANCHE B -------------------------------- #
    # ① nominal: optimize geldiyse kullan, yoksa %10.178 kuralı
    if request.tranche_b.nominal and request.tranche_b.nominal > 0:
        B_nominal = request.tranche_b.nominal
    else:
        percent_b = 10.17811704
        total_a = sum(A_nom)
        B_nominal = (total_a * percent_b) / (100 - percent_b)
        B_nominal = round(B_nominal / 1_000) * 1_000

    B_nominal = max(1_000, round(B_nominal / 1_000) * 1_000)

    # ② diğer B parametreleri
    raw_b_day = request.tranche_b.maturity_days
    B_days = min(365, max(1, raw_b_day))          # 1‑365 sınırı
    B_base = request.tranche_b.base_rate
    B_spread = request.tranche_b.spread
    B_reinv = request.tranche_b.reinvest_rate

    # ----------------------- PARAMETRELERİ BİRLEŞTİR ----------------------- #
    all_days = A_mats + [B_days]
    all_base = A_base + [B_base]
    all_spread = A_spread + [B_spread]
    all_reinv = A_reinv + [B_reinv]
    all_nom = A_nom + [B_nominal]
    all_dates = [start_date + pd.Timedelta(d, "D") for d in all_days]

    # --------------------- NAKİT‑AKIŞINI TRANCHLERE DAĞIT ------------------ #
    tr_cf = assign_cash_flows_to_tranches(df_calc, start_date, all_dates, all_reinv)

    # ------------------------- HESAP DÖNGÜSÜ ------------------------------- #
    results: List[Dict[str, Any]] = []
    buffer = 0.0
    conversions = []

    for i, days in enumerate(all_days):
        is_a = i < len(A_mats)
        t_name = f"Class {'A' if is_a else 'B'}{i+1 if is_a else ''}".strip()

        c_flow, r_ret, *_ = calculate_totals(tr_cf[i], all_dates[i], all_reinv[i])

        # buffer faizi
        buf_reinv = 0.0
        if i > 0 and buffer > 0 and days > all_days[i-1]:
            factor = (1 + simple_to_compound_annual(all_reinv[i])/100)**(
                (days - all_days[i-1]) / 365
            ) - 1
            buf_reinv = buffer * factor

        available = c_flow + r_ret + buffer + buf_reinv
        nominal = all_nom[i]

        if is_a:
            total_rate = all_base[i] + all_spread[i]/100
            disc = 1 / (1 + total_rate/100 * days/365) if days else 1
            principal = nominal * disc
            interest = nominal - principal
            coupon = coupon_rate = eff_coupon = 0.0
            total_pay = nominal
        else:
            principal = max(0.001, nominal)
            coupon = max(0, available - principal)
            coupon_rate = coupon / principal * 100 if principal > 0.001 else 0.0
            eff_coupon = (
                coupon / principal * 365 / days * 100
                if principal > 0.001 and days > 0
                else 0.0
            )
            interest = 0.0
            total_pay = principal + coupon
            total_rate = 0  # Class B’de gösterilmiyor

        new_buffer = max(0.0, available - total_pay)
        buf_ratio = new_buffer / nominal * 100 if nominal else 0.0

        # dönüşüm tablosu (UI)
        conversions.append({
            "Tranche": t_name,
            "Maturity Days": days,
            "Simple Annual Interest (%)": total_rate if is_a else coupon_rate,
            "Compound Interest for Period (%)": (
                simple_to_maturity_compound(total_rate, days) if is_a else eff_coupon
            ),
            "Reinvest Simple Annual (%)": all_reinv[i],
            "Reinvest O/N Compound (%)": overnight_to_annual_compound(all_reinv[i]),
            "Coupon Rate (%)": coupon_rate if not is_a else 0.0,
            "Effective Coupon Rate (%)": eff_coupon if not is_a else 0.0,
        })

        results.append({
            "Tranche": t_name,
            "Start Date": start_date.strftime("%d/%m/%Y"),
            "Maturity Days": days,
            "Maturity Date": all_dates[i].strftime("%d/%m/%Y"),
            "Base Rate (%)": all_base[i],
            "Spread (bps)": all_spread[i],
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

        buffer = new_buffer

    # --------------------------- TOPLAM SONUÇLAR --------------------------- #
    a_rows = [r for r in results if r["Is Class A"]]
    b_rows = [r for r in results if not r["Is Class A"]]

    class_a_total = sum(r["Total Payment"] for r in a_rows)
    class_b_total = sum(r["Total Payment"] for r in b_rows)
    class_a_principal = sum(r["Principal"] for r in a_rows)
    class_b_principal = sum(r["Principal"] for r in b_rows)
    class_a_interest = sum(r["Interest"] for r in a_rows)
    class_b_coupon = sum(r["Coupon Payment"] for r in b_rows)
    min_buffer_actual = min(
        r["Buffer Cash Flow Ratio (%)"] for r in a_rows
    ) if a_rows else 0.0

    total_principal_paid = class_a_principal + class_b_principal
    total_loan_principal = df_calc["principal_amount"].sum()
    financing_cost = total_principal_paid - total_loan_principal

    return CalculationResult(
        class_a_total=class_a_total,
        class_b_total=class_b_total,
        class_a_principal=class_a_principal,
        class_b_principal=class_b_principal,
        class_a_interest=class_a_interest,
        class_b_coupon=class_b_coupon,
        min_buffer_actual=min_buffer_actual,
        total_principal_paid=total_principal_paid,
        total_loan_principal=total_loan_principal,
        financing_cost=financing_cost,
        tranche_results=results,
        interest_rate_conversions=conversions,
    )
