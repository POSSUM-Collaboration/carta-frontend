import {describe, expect, test} from "@jest/globals";

import {HEALPIX_PROJECTIONS, HealpixOptionsStore} from "./HealpixOptionsStore";

describe("HealpixOptionsStore", () => {
    test("defaults produce an all-default message", () => {
        const store = new HealpixOptionsStore();
        expect(store.isDefault).toBe(true);
        expect(store.isZenithal).toBe(false);
        expect(store.toMessage()).toEqual({
            projection: "MOL",
            frame: "",
            hasCenter: false,
            centerLon: 0,
            centerLat: 0,
            pixelScale: 0,
            width: 0,
            height: 0,
            bilinear: false,
            columns: [],
            matchImage: false,
            matchFileId: -1
        });
    });

    test("converts the pixel scale from arcminutes to degrees and clamps the centre", () => {
        const store = new HealpixOptionsStore();
        store.setProjection("TAN");
        store.setHasCenter(true);
        store.setCenter(266.4, -95);
        store.setPixelScaleArcmin(3);
        store.setSize(400.4, -5);
        expect(store.isZenithal).toBe(true);
        expect(store.isDefault).toBe(false);
        const message = store.toMessage();
        expect(message.projection).toBe("TAN");
        expect(message.centerLat).toBe(-90);
        expect(message.pixelScale).toBeCloseTo(0.05, 10);
        expect(message.width).toBe(400);
        expect(message.height).toBe(0);
    });

    test("column toggling keeps file order and collapses 'all' to an empty selection", () => {
        const store = new HealpixOptionsStore();
        const available = ["I_STOKES", "Q_STOKES", "U_STOKES"];
        store.toggleColumn("Q_STOKES", available);
        expect(store.columns).toEqual(["I_STOKES", "U_STOKES"]);
        store.toggleColumn("I_STOKES", available);
        expect(store.columns).toEqual(["U_STOKES"]);
        store.toggleColumn("Q_STOKES", available);
        store.toggleColumn("I_STOKES", available);
        expect(store.columns).toEqual([]);
    });

    test("matching an image is only sent with a valid file id", () => {
        const store = new HealpixOptionsStore();
        store.setMatchImage(true);
        expect(store.toMessage().matchImage).toBe(false);
        store.setMatchImage(true, 3);
        expect(store.toMessage()).toMatchObject({matchImage: true, matchFileId: 3});
        store.reset();
        expect(store.isDefault).toBe(true);
    });

    test("every offered projection has a unique code", () => {
        const codes = HEALPIX_PROJECTIONS.map(p => p.value);
        expect(new Set(codes).size).toBe(codes.length);
        expect(codes).toContain("HPX");
    });
});
