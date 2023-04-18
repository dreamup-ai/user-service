import { expect } from "chai";
import { getUpdateExpressionForArbitrarilyNestedUpdate } from "../src/crud";

describe("getUpdateExpressionForArbitrarilyNestedUpdate", () => {
  it("should return the correct update expression for a nested object #1", () => {
    const data = {
      some: {
        deeply: {
          nested: {
            value: 1,
          },
        },
      },
    };
    const result = getUpdateExpressionForArbitrarilyNestedUpdate(data);
    expect(result).to.deep.equal({
      UpdateExpression: "SET #K0.#K1.#K2.#K3 = :val0",
      ExpressionAttributeNames: {
        "#K0": "some",
        "#K1": "deeply",
        "#K2": "nested",
        "#K3": "value",
      },
      ExpressionAttributeValues: {
        ":val0": {
          N: "1",
        },
      },
    });
  });

  it("should return the correct update expression for a nested object #2", () => {
    const data = {
      shallow: "field",
      some: {
        deeply: {
          nested: {
            value: 1,
          },
        },
        lessDeeply: "value",
      },
    };

    const result = getUpdateExpressionForArbitrarilyNestedUpdate(data);
    expect(result).to.deep.equal({
      UpdateExpression:
        "SET #K0 = :val0, #K1.#K2.#K3.#K4 = :val1, #K1.#K5 = :val2",
      ExpressionAttributeNames: {
        "#K0": "shallow",
        "#K1": "some",
        "#K2": "deeply",
        "#K3": "nested",
        "#K4": "value",
        "#K5": "lessDeeply",
      },
      ExpressionAttributeValues: {
        ":val0": {
          S: "field",
        },
        ":val1": {
          N: "1",
        },
        ":val2": {
          S: "value",
        },
      },
    });
  });
});
