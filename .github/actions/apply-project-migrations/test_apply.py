import http.client
import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest.mock import MagicMock, patch

import apply


API_URL = "https://api.example.com"
SECRET_KEY = "test-project-secret"


def response(status: int, body: dict[str, str] | None = None) -> MagicMock:
    reply = MagicMock()
    reply.status = status
    reply.read.return_value = json.dumps(body).encode("utf-8")
    reply.__enter__.return_value = reply

    return reply


class MigrationActionTest(unittest.TestCase):
    def setUp(self) -> None:
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.migrations = Path(directory.name)
        self.migrations.joinpath("20261118140500_create_items.sql").write_bytes(
            b"CREATE TABLE items (id int);\r\n"
        )
        self.migrations.joinpath("20261119140500_add_name.sql").write_bytes(
            b"ALTER TABLE items ADD COLUMN name text;\n"
        )

    def run_action(self, url: str = API_URL, key: str = SECRET_KEY) -> tuple[int, str]:
        output = io.StringIO()
        environment = {"NELCOTA_API_URL": url, "NELCOTA_SECRET_KEY": key}
        with patch.dict(os.environ, environment), redirect_stdout(output), redirect_stderr(output):
            status = apply.main(self.migrations)

        return status, output.getvalue()

    @patch.object(http.client, "HTTPSConnection")
    def test_posts_in_version_order_and_preserves_file_bytes(self, connect: MagicMock) -> None:
        connection = connect.return_value
        connection.getresponse.side_effect = [response(200), response(201)]

        status, output = self.run_action()

        self.assertEqual(status, 0)
        first, second = connection.request.call_args_list
        self.assertEqual(first.args, ("POST", "/database/v1/migrations"))
        self.assertEqual(first.kwargs["headers"]["apikey"], SECRET_KEY)
        self.assertEqual(json.loads(first.kwargs["body"]), {
            "version": 20261118140500,
            "name": "create_items",
            "sql": "CREATE TABLE items (id int);\r\n",
        })
        self.assertEqual(json.loads(second.kwargs["body"])["version"], 20261119140500)
        self.assertIn("already applied", output)
        self.assertIn("applied.", output)
        self.assertNotIn(SECRET_KEY, output)

    @patch.object(http.client, "HTTPSConnection")
    def test_failure_stops_later_files_and_keeps_response_details_out_of_logs(
        self, connect: MagicMock
    ) -> None:
        connection = connect.return_value
        for http_status, code in ((409, "migration_mismatch"), (400, "sql_error")):
            with self.subTest(code=code):
                connection.request.reset_mock()
                connection.getresponse.return_value = response(
                    http_status, {"error": code, "message": SECRET_KEY}
                )

                status, output = self.run_action()

                self.assertEqual(status, 1)
                self.assertIn(f"HTTP {http_status}, {code}", output)
                self.assertNotIn(SECRET_KEY, output)
                self.assertEqual(connection.request.call_count, 1)

    @patch.object(http.client, "HTTPSConnection")
    def test_redirect_and_network_failure_stop_the_action(self, connect: MagicMock) -> None:
        connection = connect.return_value
        connection.getresponse.return_value = response(307)
        self.assertEqual(self.run_action()[0], 1)
        self.assertEqual(connection.request.call_count, 1)

        connection.request.side_effect = TimeoutError(SECRET_KEY)
        status, output = self.run_action()
        self.assertEqual(status, 1)
        self.assertNotIn(SECRET_KEY, output)

    @patch.object(http.client, "HTTPSConnection")
    def test_invalid_environment_and_duplicate_versions_fail_before_network(
        self, connect: MagicMock
    ) -> None:
        self.assertEqual(self.run_action(url="http://api.example.com")[0], 1)
        self.assertEqual(self.run_action(key="")[0], 1)
        self.migrations.joinpath("20261118140500_duplicate.sql").write_text(
            "SELECT 1;", encoding="utf-8"
        )

        status, output = self.run_action()

        self.assertEqual(status, 1)
        self.assertIn("duplicate version", output)
        connect.assert_not_called()

    @patch.object(http.client, "HTTPSConnection")
    def test_unreadable_and_malformed_files_fail_before_their_request(
        self, connect: MagicMock
    ) -> None:
        invalid = self.migrations / "00000000000001_wrong_encoding.sql"
        invalid.write_bytes(b"\xff")
        self.assertEqual(self.run_action()[0], 1)

        invalid.rename(self.migrations / "invalid.sql")
        status, output = self.run_action()
        self.assertEqual(status, 1)
        self.assertIn("Invalid migration filename", output)
        connect.assert_not_called()
