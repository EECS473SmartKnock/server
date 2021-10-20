import sqlite3 from "sqlite3";

export enum MessageType {
    LOCK = "LOCK",
    UNLOCK = "UNLOCK"
}

export class MessageDBRow {
    id: Number = 0;
    message_type: MessageType = MessageType.LOCK;
}

export class MessageDB {
    _db?: sqlite3.Database;

    initialize() {
        this._db = new sqlite3.Database("./messages.db",
            sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
            (err) => {
                this._db?.run(`CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    target_id TEXT NOT NULL,
                    message_type TEXT NOT NULL,
                    time_created DATETIME NOT NULL
                );`)
            });
    }

    clean_expired_messages(target_id?: string) {
        if (target_id) {
            // clean the ones for this target
            this._db?.run(`DELETE FROM messages WHERE time_created < ? AND target_id = ?`, [Date.now() - 1000 * 60 * 60 * 3, target_id]);
        } else {
            // clean all messages
            this._db?.run(`DELETE FROM messages WHERE time_created < ?`, [Date.now() - 1000 * 60 * 60 * 3]);
        }
    }

    queue_message(target_id: string, type: MessageType) {
        this._db?.run(`INSERT INTO messages (target_id, message_type, time_created) VALUES (?, ?, ?);`, [target_id, type, Date.now()]);
    }

    get_messages(target_id: string) {
        return new Promise((resolve, reject) => {
            this._db?.all("SELECT id id, message_type message_type FROM messages WHERE target_id = ? ORDER BY time_created", [target_id], (err, rows) => {
                if (err) reject(err);
                this.clean_expired_messages(target_id);
                resolve(rows);
            })
        });
    }
}

