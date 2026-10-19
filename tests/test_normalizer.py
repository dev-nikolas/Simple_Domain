import pytest
from simple_domain.service.analysis.normalizer import normalize_csv, normalize_json


def test_normalize_csv_arithmetic_progression():
    csv_text = "step,val\n1,3\n2,6\n3,9\n4,12\n5,15\n"
    ds = normalize_csv(csv_text, "progression.csv")
    assert ds.format_type == "csv"
    assert ds.row_count == 5
    assert "step" in ds.column_names
    assert "val" in ds.column_names
    assert ds.column_types["val"] == "numeric"
    series = next(s for s in ds.numeric_series if s.name == "val")
    assert series.values == [3.0, 6.0, 9.0, 12.0, 15.0]


def test_normalize_json_direct_array():
    json_text = "[2, 4, 6, 8, 10, 12]"
    ds = normalize_json(json_text, "numbers.json")
    assert ds.format_type == "json"
    assert ds.row_count == 6
    assert ds.column_names == ["sequence"]
    assert ds.numeric_series[0].values == [2.0, 4.0, 6.0, 8.0, 10.0, 12.0]


def test_normalize_json_tabular_objects():
    json_text = """[
        {"sensor": "s1", "temp": 20.5, "pressure": 100},
        {"sensor": "s2", "temp": 21.5, "pressure": 105},
        {"sensor": "s3", "temp": 22.5, "pressure": 110}
    ]"""
    ds = normalize_json(json_text, "sensors.json")
    assert ds.row_count == 3
    assert ds.column_types["temp"] == "numeric"
    assert ds.column_types["sensor"] == "categorical"
    temp_series = next(s for s in ds.numeric_series if s.name == "temp")
    assert temp_series.values == [20.5, 21.5, 22.5]


def test_normalize_csv_missing_and_non_numeric():
    csv_text = "id,reading\n1,10.0\n2,N/A\n3,30.0\n4,bad\n5,50.0\n"
    ds = normalize_csv(csv_text, "mixed.csv")
    reading_series = next(s for s in ds.numeric_series if s.name == "reading")
    assert reading_series.values == [10.0, 30.0, 50.0]
    assert reading_series.excluded_count == 2
    assert len(reading_series.warnings) > 0


def test_normalize_empty_and_malformed_rejections():
    with pytest.raises(ValueError, match="vacío"):
        normalize_csv("", "empty.csv")

    with pytest.raises(ValueError, match="vacío"):
        normalize_json("[]", "empty.json")

    with pytest.raises(ValueError, match="malformado"):
        normalize_json("{ bad json :", "bad.json")
