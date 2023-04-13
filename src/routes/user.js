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
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
const routes = (server, { userTable, queueManager, }) => __awaiter(void 0, void 0, void 0, function* () {
    server.post("/user", {
        schema: {
            body: types_1.systemUserUpdateSchema,
            response: {
                201: types_1.userSchema,
            },
        },
        preValidation: (req, res) => __awaiter(void 0, void 0, void 0, function* () { }),
        handler: (req, res) => __awaiter(void 0, void 0, void 0, function* () { }),
    });
});
