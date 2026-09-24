import os
import tempfile
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
import main


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        main.DB_PATH = os.path.join(self.temp.name, "scores.db")
        main._db_conn = None
        self.client = TestClient(main.app)
        self.score = dict(nickname="visitor", wpm=50, accuracy=98, raw=52, mode="singlish", duration=30)

    def tearDown(self):
        if main._db_conn:
            main._db_conn.close()
        main._db_conn = None
        self.temp.cleanup()

    def test_scores_and_best_rank_still_work(self):
        self.assertEqual(self.client.post("/api/score", json=self.score).status_code, 200)
        rows = self.client.get("/api/leaderboard?mode=singlish&duration=30").json()
        self.assertEqual(rows[0]["wpm"], 50)

    def test_invalid_board_and_blank_names(self):
        for field, value in [("nickname", "  "), ("duration", 1), ("mode", "spam"), ("raw", 1001)]:
            self.assertEqual(self.client.post("/api/score", json={**self.score, field: value}).status_code, 422)

    def test_quota_cannot_be_bypassed_with_forwarded_header_and_expires(self):
        with patch("main.time.time", return_value=120):
            for i in range(10):
                self.assertEqual(self.client.post("/api/score", json=self.score, headers={"X-Forwarded-For": f"1.2.3.{i}"}).status_code, 200)
            limited = self.client.post("/api/score", json=self.score)
            self.assertEqual(limited.status_code, 429)
            self.assertEqual(limited.headers["retry-after"], "60")
        with patch("main.time.time", return_value=180):
            self.assertEqual(self.client.post("/api/score", json=self.score).status_code, 200)

    def test_cors_denies_unrelated_origin(self):
        response = self.client.options("/api/score", headers={"Origin":"https://evil.example", "Access-Control-Request-Method":"POST"})
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
