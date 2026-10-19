import concurrent.futures
import json
import pytest
from simple_domain.storage.json_store import JsonStore, StorageCorruptionError


def test_json_store_initialization_and_empty(tmp_path):
    file_path = str(tmp_path / "sub" / "data.json")
    store = JsonStore(file_path, default_factory=lambda: {"items": []})
    assert store.read() == {"items": []}
    assert (tmp_path / "sub" / "data.json").exists()


def test_json_store_write_and_read(tmp_path):
    file_path = str(tmp_path / "store.json")
    store = JsonStore(file_path, default_factory=dict)
    store.write({"version": 1, "records": [{"id": "1", "name": "alpha"}]})
    data = store.read()
    assert data["version"] == 1
    assert len(data["records"]) == 1
    assert data["records"][0]["name"] == "alpha"


def test_json_store_corrupted_file_raises_error(tmp_path):
    file_path = tmp_path / "corrupt.json"
    file_path.write_text("{ this is not valid json : [", encoding="utf-8")
    store = JsonStore(str(file_path))
    with pytest.raises(StorageCorruptionError) as exc_info:
        store.read()
    assert "corrupto" in str(exc_info.value).lower()


def test_json_store_concurrent_writes(tmp_path):
    file_path = str(tmp_path / "concurrent.json")
    store = JsonStore(file_path, default_factory=lambda: {"counter": 0})

    def increment(n):
        for _ in range(10):
            current = store.read()
            store.write({"counter": current.get("counter", 0) + 1})
        return n

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(increment, i) for i in range(4)]
        for f in concurrent.futures.as_completed(futures):
            assert f.result() is not None

    final_data = store.read()
    assert final_data["counter"] > 0
