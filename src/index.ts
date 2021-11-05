import express from "express";
import path from "path";
import { MessageDB, MessageType, MessageDBRow } from './db'
const app = express();
const port = process.env.PORT ?? 8080;

let db = new MessageDB();

db.initialize();
setInterval(() => { db.clean_expired_messages() }, 1000 * 60);

app.get("/", (req, res) => {
    res.sendFile('./index.html', { root: './public' });
});

app.post("/:target_id", (req, res) => {
    const type: MessageType = req.query.type as MessageType;
    const passphrase: string = req.query.passphrase as string;

    if (type) {
        db.queue_message(req.params.target_id, type, passphrase);
        res.send('success');
    }
});

app.get("/:target_id", (req, res) => {
    const format: string = req.query.format as string;
    db.get_messages(req.params.target_id).then((val) => {
        if (format == "spaces") {
            let str = "";
            let rows = val as Array<MessageDBRow>;
            rows.forEach(msg => {
                str += msg.id + " " + msg.message_type + " " + msg.hash + "\n";
            });
            res.send(str);
        }
        else { res.send(val); }
    });
})

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});