import sqlite3 from "sqlite3";
import crypto from "crypto";

export enum MessageType {
    LOCK = "LOCK",
    UNLOCK = "UNLOCK"
}

export class MessageDBRow {
    id: Number = 0;
    message_type: MessageType = MessageType.LOCK;
    hash: String = ""; // sha256
}

export class MessageDB {
    initialize() {
        let db = new sqlite3.Database("./messages.db",
            sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
            (err) => {
                db.run(`CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    target_id TEXT NOT NULL,
                    message_type TEXT NOT NULL,
                    hash TEXT,
                    time_created DATETIME NOT NULL
                );`)
            });
    }

    get_db() {
        return new sqlite3.Database("./messages.db",
            sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
        );
    }

    clean_expired_messages(target_id?: string) {
        if (target_id) {
            // clean the ones for this target
            this.get_db().run(`DELETE FROM messages WHERE time_created < ? AND target_id = ?`, [Date.now() - 1000 * 60 * 60 * 3, target_id]);
        } else {
            // clean all messages
            this.get_db().run(`DELETE FROM messages WHERE time_created < ?`, [Date.now() - 1000 * 60 * 60 * 3]);
        }
    }

    hash_message(type: MessageType, passphrase: string, id: number) {
        // Return sha256 hash of the type, id, and passphrase concatenated
        return crypto.createHash('sha256').update(type + id.toString() + passphrase).digest('hex');
    }

    queue_message(target_id: string, type: MessageType, passphrase: string) {
        let db = this.get_db();
        db.run(`INSERT INTO messages (target_id, message_type, time_created) VALUES (?, ?, ?);`, [target_id, type, Date.now()], (err) => {
            if (err) console.log(err);
            // Set hash for the message we just inserted
            db.get(`SELECT last_insert_rowid()`, (err, row) => {
                if (err) console.log(err);
                let id = row['last_insert_rowid()'];
                db.run(`UPDATE messages SET hash = ? WHERE id = ?`, [this.hash_message(type, passphrase, id), id], (err) => {
                    if (err) console.log(err);
                });
            });
        });
    }

    get_messages(target_id: string) {
        return new Promise((resolve, reject) => {
            this.get_db().all("SELECT id id, message_type message_type, hash hash FROM messages WHERE target_id = ? ORDER BY time_created", [target_id], (err, rows) => {
                if (err) reject(err);
                this.clean_expired_messages(target_id);
                resolve(rows);
            })
        });
    }
}

