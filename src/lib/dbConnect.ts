import mongoose from "mongoose";

type ConnectionObject = {
    isConnected?: number;
}

const connection: ConnectionObject = {};

async function dbConnect() {
    // check whether we have already a connection to the database.
    if (connection.isConnected) {
        console.log("Already connected to the database");
        return;
    }

    // now we try to connect to the database
    try {
        const db = await mongoose.connect(process.env.MONGODB_URL || "");
        connection.isConnected = db.connections[0].readyState;

        console.log("Connected to the database");
    } catch (error) {
        console.error("Error connecting to the database", error);
        process.exit(1);
    }
}

export default dbConnect;
