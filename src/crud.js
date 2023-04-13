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
exports.createUser = void 0;
const interfaces_1 = require("interfaces");
const config_1 = __importDefault(require("./config"));
const webhooks_1 = require("./webhooks");
const createUser = ({ user, userTable, queueManager, log, }) => __awaiter(void 0, void 0, void 0, function* () {
    const { items: existingUsers } = yield userTable.query({
        query: { email: user.email },
        pageSize: 1,
        sortKey: "created",
        sortDir: interfaces_1.SortDirection.DESC,
    });
    if (existingUsers.length > 0) {
        const e = new Error("User already exists");
        e.name = "UserExistsError";
        throw e;
    }
    const [created, queue] = yield Promise.all([
        // Create the user
        userTable.create(user),
        // Create the user's queue
        queueManager.createQueue(`${config_1.default.queue.sd_prefix}${user.id}`),
    ]);
    (0, webhooks_1.sendWebhook)("user.created", created, log);
    return created;
});
exports.createUser = createUser;
