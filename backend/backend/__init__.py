# backend/backend/__init__.py
import os

# 是否使用 MySQL（默认 False，SQLite）
USE_MYSQL = os.getenv("USE_MYSQL", "false").lower() in ("1", "true", "yes")

if USE_MYSQL:
    try:
        import pymysql
        pymysql.install_as_MySQLdb()
    except ModuleNotFoundError as e:
        raise ImportError(
            "USE_MYSQL=true but pymysql is not installed. "
            "Please run: pip install pymysql"
        ) from e
