import type {CARTA} from "carta-protobuf";
import {action, computed, makeObservable, observable} from "mobx";

/** WCS projection codes offered for reprojecting a HEALPix map, with display names. */
export const HEALPIX_PROJECTIONS: {value: string; label: string; zenithal: boolean}[] = [
    {value: "MOL", label: "Mollweide (MOL)", zenithal: false},
    {value: "AIT", label: "Hammer-Aitoff (AIT)", zenithal: false},
    {value: "CAR", label: "Plate carrée (CAR)", zenithal: false},
    {value: "SFL", label: "Sanson-Flamsteed (SFL)", zenithal: false},
    {value: "CEA", label: "Cylindrical equal area (CEA)", zenithal: false},
    {value: "HPX", label: "HEALPix (HPX)", zenithal: false},
    {value: "ZEA", label: "Zenithal equal area (ZEA)", zenithal: true},
    {value: "TAN", label: "Gnomonic (TAN)", zenithal: true},
    {value: "SIN", label: "Orthographic (SIN)", zenithal: true},
    {value: "STG", label: "Stereographic (STG)", zenithal: true},
    {value: "ARC", label: "Zenithal equidistant (ARC)", zenithal: true}
];

/** Celestial frames the map can be reprojected into. An empty value keeps the map's own frame. */
export const HEALPIX_FRAMES: {value: string; label: string}[] = [
    {value: "", label: "Map frame"},
    {value: "G", label: "Galactic"},
    {value: "C", label: "Equatorial (ICRS)"},
    {value: "E", label: "Ecliptic"}
];

/**
 * Settings describing how a HEALPix map is reprojected onto a regular grid when it is opened.
 * Zero or empty values mean "use the map's defaults" (all-sky, native resolution, map frame, all columns).
 */
export class HealpixOptionsStore {
    @observable projection: string = "MOL";
    @observable frame: string = "";
    @observable hasCenter: boolean = false;
    @observable centerLon: number = 0;
    @observable centerLat: number = 0;
    /** Pixel scale in arcminutes; 0 = the HEALPix pixel resolution. */
    @observable pixelScaleArcmin: number = 0;
    /** Grid size in pixels; 0 = enough to cover the sky (90 degrees for zenithal projections). */
    @observable width: number = 0;
    @observable height: number = 0;
    @observable isBilinear: boolean = false;
    /** Selected table columns; empty = all data columns. */
    @observable columns: string[] = [];
    @observable shouldMatchImage: boolean = false;
    @observable matchFileId: number = -1;
    /** When matching: extend the grid around the image (same WCS and pixel scale) so zooming out shows the map around it. */
    @observable shouldExtendSky: boolean = true;

    constructor() {
        makeObservable(this);
    }

    @computed get isZenithal(): boolean {
        return HEALPIX_PROJECTIONS.find(p => p.value === this.projection)?.zenithal ?? false;
    }

    /** Whether any setting differs from the backend defaults (so the file info needs refreshing before loading). */
    @computed get isDefault(): boolean {
        return this.projection === "MOL" && this.frame === "" && !this.hasCenter && this.pixelScaleArcmin === 0 && this.width === 0 && this.height === 0 && !this.isBilinear && this.columns.length === 0 && !this.shouldMatchImage;
    }

    @action reset = () => {
        this.projection = "MOL";
        this.frame = "";
        this.hasCenter = false;
        this.centerLon = 0;
        this.centerLat = 0;
        this.pixelScaleArcmin = 0;
        this.width = 0;
        this.height = 0;
        this.isBilinear = false;
        this.columns = [];
        this.shouldMatchImage = false;
        this.matchFileId = -1;
        this.shouldExtendSky = true;
    };

    @action setProjection = (projection: string) => {
        this.projection = projection;
    };

    @action setFrame = (frame: string) => {
        this.frame = frame;
    };

    @action setHasCenter = (hasCenter: boolean) => {
        this.hasCenter = hasCenter;
    };

    @action setCenter = (lon: number, lat: number) => {
        if (isFinite(lon)) {
            this.centerLon = lon;
        }
        if (isFinite(lat)) {
            this.centerLat = Math.max(-90, Math.min(90, lat));
        }
    };

    @action setPixelScaleArcmin = (scale: number) => {
        this.pixelScaleArcmin = isFinite(scale) && scale > 0 ? scale : 0;
    };

    @action setSize = (width: number, height: number) => {
        this.width = isFinite(width) && width > 0 ? Math.round(width) : 0;
        this.height = isFinite(height) && height > 0 ? Math.round(height) : 0;
    };

    @action setBilinear = (isBilinear: boolean) => {
        this.isBilinear = isBilinear;
    };

    @action setColumns = (columns: string[]) => {
        this.columns = columns.slice();
    };

    @action toggleColumn = (column: string, available: string[]) => {
        // An empty selection means all columns; toggling one off from "all" leaves the others selected
        const current = this.columns.length ? this.columns.slice() : available.slice();
        const index = current.indexOf(column);
        if (index >= 0) {
            current.splice(index, 1);
        } else {
            current.push(column);
        }
        // Keep the file's column order
        const ordered = available.filter(name => current.includes(name));
        this.columns = ordered.length === available.length ? [] : ordered;
    };

    @action setExtendSky = (shouldExtendSky: boolean) => {
        this.shouldExtendSky = shouldExtendSky;
    };

    @action setMatchImage = (shouldMatchImage: boolean, fileId?: number) => {
        this.shouldMatchImage = shouldMatchImage;
        if (fileId !== undefined) {
            this.matchFileId = fileId;
        }
    };

    /** The protobuf message to send with FileInfoRequest and OpenFile. */
    toMessage = (): CARTA.HealpixOptions.$Properties => {
        return {
            projection: this.projection,
            frame: this.frame,
            hasCenter: this.hasCenter,
            centerLon: this.centerLon,
            centerLat: this.centerLat,
            pixelScale: this.pixelScaleArcmin / 60.0,
            width: this.width,
            height: this.height,
            bilinear: this.isBilinear,
            columns: this.columns.slice(),
            matchImage: this.shouldMatchImage && this.matchFileId >= 0,
            matchFileId: this.matchFileId,
            extendSky: this.shouldMatchImage && this.matchFileId >= 0 && this.shouldExtendSky
        };
    };
}
