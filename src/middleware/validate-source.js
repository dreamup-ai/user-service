"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSourceValidator = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const makeSourceValidator = (publicKey, header) => {
    return function sourceValidator(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { [header]: signature } = req.headers;
            if (!signature) {
                return res.status(400).send({
                    error: "Missing signature",
                });
            }
            if (Array.isArray(signature)) {
                return res.status(400).send({
                    error: "Only Include One Signature",
                });
            }
            // Request must be valid
            const isVerified = node_crypto_1.default.verify("sha256", Buffer.from(JSON.stringify(req.body)), publicKey, Buffer.from(signature, "base64"));
            if (!isVerified) {
                return res.status(401).send({
                    error: "Invalid signature",
                });
            }
        });
    };
};
exports.makeSourceValidator = makeSourceValidator;
