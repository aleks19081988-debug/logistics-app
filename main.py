import io
import pandas as pd
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Logistics App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1nGRnER-mQj81NugFTaR1rBP87w8a00riPXBFqZDU1dI/edit?gid=0#gid=0"


def get_sheet_data():
    try:
        sheet_id = SPREADSHEET_URL.split("/d/")[1].split("/")[0]
        export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&id={sheet_id}"

        response = requests.get(export_url, timeout=10)
        response.encoding = "utf-8"

        if response.status_code != 200:
            print(f"❌ Ошибка доступа к Google Таблице (код {response.status_code})")
            return []

        df = pd.read_csv(io.StringIO(response.text))
        df = df.fillna("")
        return df.to_dict(orient="records")

    except Exception as e:
        print("❌ Ошибка при чтении таблицы:", e)
        return []


@app.get("/")
def home():
    return {"status": "online"}


@app.get("/api/routes-by-vehicle")
def get_routes_by_vehicle():
    data = get_sheet_data()
    if not data:
        return {}

    sample_row = data[0]

    vehicle_column = None
    target_names = ["№ авто", "авто", "машина", "автомобіль", "транспорт", "водій", "водитель"]

    for col_name in sample_row.keys():
        clean_col = str(col_name).strip().lower()
        if any(t in clean_col for t in target_names):
            vehicle_column = col_name
            break

    if not vehicle_column:
        cols = list(sample_row.keys())
        vehicle_column = cols[1] if len(cols) > 1 else cols[0]

    grouped = {}
    for row in data:
        raw_val = str(row.get(vehicle_column, "")).strip()

        if raw_val.endswith(".0"):
            raw_val = raw_val[:-2]

        if not raw_val or raw_val.lower() in ["nan", "none", "null"]:
            vehicle_key = "Без номера авто"
        else:
            vehicle_key = raw_val

        if vehicle_key not in grouped:
            grouped[vehicle_key] = []
        grouped[vehicle_key].append(row)

    return grouped