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
const types_1 = require("../types");
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("../config"));
const validate_source_1 = require("../middleware/validate-source");
const crud_1 = require("../crud");
const routes = (server, { userTable, queueManager, }) => __awaiter(void 0, void 0, void 0, function* () {
    /**
     * Create a new user. Only accepts input signed
     * by the dreamup private key.
     */
    server.post("/user", {
        schema: {
            body: types_1.systemUserUpdateSchema,
            response: {
                201: types_1.userSchema,
            },
        },
        preValidation: (0, validate_source_1.makeSourceValidator)(config_1.default.webhooks.publicKey, config_1.default.webhooks.header),
        handler: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            const { body } = req;
            const id = (0, uuid_1.v4)();
            const user = Object.assign(Object.assign({ id }, body), { created: Date.now(), "idp:dreamup": {
                    id,
                } });
            try {
                const created = yield (0, crud_1.createUser)({
                    user,
                    userTable,
                    queueManager,
                    log: server.log,
                });
                return res.status(201).send(created);
            }
            catch (e) {
                server.log.error(e);
                return res.status(500).send({
                    error: "Internal server error",
                });
            }
        }),
    });
});
exports.default = routes;
