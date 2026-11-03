import {describe, expect, test} from "@jest/globals";
import {CARTA} from "carta-protobuf";

import {AxisOrderStore} from "./AxisOrderStore";

// A 5D cube as the backend describes it in file order: RA, DEC, FREQ, STOKES, TIME
const CUBE_AXES: CARTA.AxisInfo.$Properties[] = [
    {number: 1, ctype: "RA---SIN", size: 12, role: CARTA.AxisRole.AxisX},
    {number: 2, ctype: "DEC--SIN", size: 10, role: CARTA.AxisRole.AxisY},
    {number: 3, ctype: "FREQ", size: 6, role: CARTA.AxisRole.AxisZ},
    {number: 4, ctype: "STOKES", size: 3, role: CARTA.AxisRole.AxisStokes},
    {number: 5, ctype: "TIME", size: 5, role: CARTA.AxisRole.AxisExtra}
];

describe("AxisOrderStore", () => {
    test("reads the default render axes from the roles and excludes Stokes from the choices", () => {
        const store = new AxisOrderStore();
        store.setFileAxes(CUBE_AXES);
        expect(store.isDefault).toBe(true);
        expect(store.hasChoice).toBe(true);
        expect(store.selectableAxes).toEqual([0, 1, 2, 4]);
        expect(store.renderAxes).toEqual({x: 0, y: 1, z: 2});
        expect(store.axisLabel(2)).toBe("3: FREQ [6]");
    });

    test("assigning a new Z axis moves it in front of the remaining axes", () => {
        const store = new AxisOrderStore();
        store.setFileAxes(CUBE_AXES);
        store.setRenderAxis("z", 4);
        expect(store.order).toEqual([0, 1, 4, 2, 3]);
        expect(store.renderAxes).toEqual({x: 0, y: 1, z: 4});
    });

    test("assigning an axis already used by another role swaps the two", () => {
        const store = new AxisOrderStore();
        store.setFileAxes(CUBE_AXES);
        store.setRenderAxis("y", 2);
        expect(store.order).toEqual([0, 2, 1, 3, 4]);
        expect(store.renderAxes).toEqual({x: 0, y: 2, z: 1});
        store.setRenderAxis("x", 2);
        expect(store.order).toEqual([2, 0, 1, 3, 4]);
        expect(store.renderAxes).toEqual({x: 2, y: 0, z: 1});
    });

    test("returning to the file order gives an empty permutation", () => {
        const store = new AxisOrderStore();
        store.setFileAxes(CUBE_AXES);
        store.setRenderAxis("z", 4);
        store.setRenderAxis("z", 2);
        expect(store.order).toEqual([]);
        expect(store.isDefault).toBe(true);
        expect(AxisOrderStore.buildOrder(3, 0, 1, 2)).toEqual([]);
        expect(AxisOrderStore.buildOrder(3, 1, 0, -1)).toEqual([1, 0, 2]);
    });

    test("a Stokes axis stays behind the chosen axes and a 2D image offers no Z", () => {
        const store = new AxisOrderStore();
        store.setFileAxes(CUBE_AXES);
        store.setRenderAxis("x", 4);
        expect(store.order).toEqual([4, 1, 2, 0, 3]);
        expect(store.renderAxes.z).toBe(2);

        store.setFileAxes(CUBE_AXES.slice(0, 2));
        expect(store.hasChoice).toBe(true);
        expect(store.renderAxes).toEqual({x: 0, y: 1, z: -1});
        store.setRenderAxis("x", 1);
        expect(store.order).toEqual([1, 0]);
        store.setFileAxes([CUBE_AXES[0], CUBE_AXES[3]]);
        expect(store.hasChoice).toBe(false);
    });
});
