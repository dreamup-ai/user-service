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
exports.sendWebhook = void 0;
const config_1 = __importDefault(require("./config"));
const node_crypto_1 = __importDefault(require("node:crypto"));
function sign(payload) {
    const signature = node_crypto_1.default.sign("sha256", Buffer.from(payload), config_1.default.webhooks.privateKey);
    return signature.toString("base64");
}
const sendWebhook = (event, data, log) => __awaiter(void 0, void 0, void 0, function* () {
    if (!config_1.default.webhooks.events[event]) {
        return;
    }
    try {
        const body = JSON.stringify({ event, payload: data });
        const signature = sign(body);
        const response = yield fetch(config_1.default.webhooks.events[event], {
            method: "POST",
            body,
            headers: {
                "Content-Type": "application/json",
                [config_1.default.webhooks.signatureHeader]: signature,
            },
        });
        if (!response.ok) {
            throw new Error(`Webhook "${event}" failed with status ${response.status}: ${response.statusText}`);
        }
    }
    catch (e) {
        log.error(`Webhook "${event}" failed: ${e.message}`);
    }
});
exports.sendWebhook = sendWebhook;
