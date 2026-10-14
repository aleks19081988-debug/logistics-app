import io
import math
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

# Координаты постоянной точки старта: СКЛАД (ул. Полярная, 20, Киев)
WAREHOUSE_ADDRESS = "Киев, ул. Полярная, 20"

def get_coordinates(address: str):
    """Получает широту и долготу по текстовому адресу через Nominatim (OpenStreetMap)"""
    if not address or not str(address).strip():
        return None, None
    
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": str(address),
        "format": "json",
        "limit": 1
    }
    headers = {
        "User-Agent": "VegtamLogisticsApp/1.0"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=5)
        if response.status_code == 200:
            results = response.json()
            if results:
                lat = float(results[0]["lat"])
                lon = float(results[0]["lon"])
                return lat, lon
    except Exception as e:
        print(f"❌ Ошибка геокодирования для адреса '{address}':", e)
        
    return None, None

def calculate_distance(lat1, lon1, lat2, lon2):
    """Считает расстояние в километрах между двумя точками по формуле Haversine"""
    if None in (lat1, lon1, lat2, lon2):
        return float('inf') # Если координат нет, отправляем в конец списка
    R = 6371.0  # Радиус Земли в км
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


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

    # Ищем колонку автомобиля
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

    # Ищем колонку адреса
    address_column = None
    address_names = ["адрес", "адреса", "пункт", "місце", "куди"]
    for col_name in sample_row.keys():
        clean_col = str(col_name).strip().lower()
        if any(a in clean_col for a in address_names):
            address_column = col_name
            break

    # Получаем координаты склада для точки отсчета
    warehouse_lat, warehouse_lon = get_coordinates(WAREHOUSE_ADDRESS)

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
        
        # Если нашли колонку с адресом, посчитаем координаты и расстояние до склада
        if address_column:
            addr_text = str(row.get(address_column, ""))
            lat, lon = get_coordinates(addr_text)
            distance = calculate_distance(warehouse_lat, warehouse_lon, lat, lon)
            row["calculated_distance"] = round(distance, 1) if distance != float('inf') else None
        else:
            row["calculated_distance"] = None

        grouped[vehicle_key].append(row)

    # Сортируем точки для каждого автомобиля от ближайшей к складу к самой дальней
    for vehicle_key in grouped:
        grouped[vehicle_key].sort(key=lambda x: x["calculated_distance"] if x["calculated_distance"] is not None else 999999)

    return grouped