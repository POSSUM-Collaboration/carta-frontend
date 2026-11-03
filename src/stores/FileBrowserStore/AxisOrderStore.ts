import {CARTA} from "carta-protobuf";
import {action, computed, makeObservable, observable} from "mobx";

export type RenderAxisRole = "x" | "y" | "z";

/**
 * Chooses which axes of an N-dimensional image are rendered (X, Y) and animated (Z), and expresses the choice as the
 * axis permutation sent to the backend: image axis i is file axis order[i] (0-based). An empty order keeps the file order.
 * The remaining axes follow in file order and become the pinned (extra) axes; a Stokes axis is never a render axis.
 */
export class AxisOrderStore {
    /** Axes of the file in the file's own order, as described by the backend */
    @observable fileAxes: CARTA.AxisInfo.$Properties[] = [];
    /** Permutation applied to the file (image axis i = file axis order[i]); empty = file order */
    @observable order: number[] = [];

    constructor() {
        makeObservable(this);
    }

    @computed get numAxes(): number {
        return this.fileAxes.length;
    }

    @computed get isDefault(): boolean {
        return this.order.length === 0;
    }

    /** File axes (0-based) that may be rendered or animated: every axis except Stokes */
    @computed get selectableAxes(): number[] {
        const axes: number[] = [];
        this.fileAxes.forEach((axis, index) => {
            if (axis.role !== CARTA.AxisRole.AxisStokes) {
                axes.push(index);
            }
        });
        return axes;
    }

    /** Whether there is a choice to make at all (at least two non-Stokes axes) */
    @computed get hasChoice(): boolean {
        return this.selectableAxes.length >= 2;
    }

    /** The file axes (0-based, -1 = none) currently assigned to X, Y and Z */
    @computed get renderAxes(): {x: number; y: number; z: number} {
        if (this.order.length) {
            const x = this.order[0] ?? -1;
            const y = this.order[1] ?? -1;
            const z = this.order.slice(2).find(axis => this.fileAxes[axis]?.role !== CARTA.AxisRole.AxisStokes) ?? -1;
            return {x, y, z};
        }
        const indexOfRole = (role: CARTA.AxisRole) => this.fileAxes.findIndex(axis => axis.role === role);
        return {x: indexOfRole(CARTA.AxisRole.AxisX), y: indexOfRole(CARTA.AxisRole.AxisY), z: indexOfRole(CARTA.AxisRole.AxisZ)};
    }

    /** Label of a file axis for display, e.g. "3: FREQ [256]" */
    axisLabel = (fileAxis: number): string => {
        const axis = this.fileAxes[fileAxis];
        if (!axis) {
            return "";
        }
        const type = axis.ctype?.trim() || "axis";
        return `${(axis.number ?? fileAxis + 1).toString()}: ${type} [${axis.size ?? 0}]`;
    };

    /** Builds the permutation for the given render axes: [x, y, z] followed by the other axes in file order; [] when it is the file order */
    static buildOrder = (numAxes: number, x: number, y: number, z: number): number[] => {
        const order: number[] = [];
        for (const axis of [x, y, z]) {
            if (axis >= 0 && axis < numAxes && !order.includes(axis)) {
                order.push(axis);
            }
        }
        for (let axis = 0; axis < numAxes; axis++) {
            if (!order.includes(axis)) {
                order.push(axis);
            }
        }
        return order.every((axis, index) => axis === index) ? [] : order;
    };

    @action setFileAxes = (axes: CARTA.AxisInfo.$Properties[] | null | undefined) => {
        this.fileAxes = axes?.slice() ?? [];
        this.order = [];
    };

    @action reset = () => {
        this.order = [];
    };

    /** Assigns a file axis to X, Y or Z; an axis already used by another role is swapped with it */
    @action setRenderAxis = (role: RenderAxisRole, fileAxis: number) => {
        const current = {...this.renderAxes};
        const previous = current[role];
        if (previous === fileAxis) {
            return;
        }
        for (const other of ["x", "y", "z"] as RenderAxisRole[]) {
            if (other !== role && current[other] === fileAxis) {
                current[other] = previous;
            }
        }
        current[role] = fileAxis;
        this.order = AxisOrderStore.buildOrder(this.numAxes, current.x, current.y, current.z);
    };
}
