import { customAlphabet } from "nanoid";

const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789_";
export const nanoid = customAlphabet(alphabet, 16);
