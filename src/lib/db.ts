import { openDB, DBSchema } from 'idb';

interface NoriDB extends DBSchema {
    images: {
        key: string;
        value: {
            id: string;
            data: string; // Base64 string
            timestamp: number;
        };
    };
}

const DB_NAME = 'nori-app-db';
const STORE_NAME = 'images';

// Init DB
export const initDB = async () => {
    return openDB<NoriDB>(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        },
    });
};

// Save image to IDB
export const saveImageToDB = async (base64Data: string): Promise<string> => {
    const db = await initDB();
    const id = crypto.randomUUID();
    await db.put(STORE_NAME, {
        id,
        data: base64Data,
        timestamp: Date.now(),
    });
    return id;
};

// Get image from IDB
export const getImageFromDB = async (id: string): Promise<string | undefined> => {
    const db = await initDB();
    const result = await db.get(STORE_NAME, id);
    return result?.data;
};

// Delete image from IDB
export const deleteImageFromDB = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
};
