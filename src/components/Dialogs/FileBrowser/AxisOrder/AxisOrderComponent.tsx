import * as React from "react";
import {AnchorButton, Collapse, FormGroup, HTMLSelect, Tooltip} from "@blueprintjs/core";
import {action, makeObservable, observable} from "mobx";
import {observer} from "mobx-react";

import {AppStore, type RenderAxisRole} from "stores";

import "./AxisOrderComponent.scss";

/**
 * Lets the user choose which axes of the selected image are rendered (X, Y) and animated (Z). Any other axes are pinned
 * at an index chosen in the Animator. Shown in the file browser for images with at least two selectable axes.
 */
@observer
export class AxisOrderComponent extends React.Component {
    @observable isOpen: boolean = true;

    constructor(props: any) {
        super(props);
        makeObservable(this);
    }

    @action private toggleOpen = () => {
        this.isOpen = !this.isOpen;
    };

    private handleAxisChanged = (role: RenderAxisRole) => (ev: React.ChangeEvent<HTMLSelectElement>) => {
        const fileAxis = parseInt(ev.currentTarget.value);
        if (isFinite(fileAxis)) {
            AppStore.Instance.fileBrowserStore.setRenderAxis(role, fileAxis);
        }
    };

    render() {
        const fileBrowserStore = AppStore.Instance.fileBrowserStore;
        const axisOrder = fileBrowserStore.axisOrder;
        if (!axisOrder.hasChoice) {
            return null;
        }

        const options = axisOrder.selectableAxes.map(axis => ({value: `${axis}`, label: axisOrder.axisLabel(axis)}));
        const renderAxes = axisOrder.renderAxes;
        const hasZ = axisOrder.selectableAxes.length >= 3;
        const extraAxes = axisOrder.selectableAxes.filter(axis => axis !== renderAxes.x && axis !== renderAxes.y && axis !== renderAxes.z);
        const helperText = extraAxes.length ? `Pinned (set in the Animator): ${extraAxes.map(axis => axisOrder.axisLabel(axis)).join(", ")}` : undefined;

        return (
            <div className="axis-order">
                <div className="axis-order-header" onClick={this.toggleOpen}>
                    <AnchorButton variant="minimal" size="small" icon={this.isOpen ? "chevron-down" : "chevron-right"} />
                    <span className="axis-order-title">Axes to display</span>
                    <Tooltip content="Back to the file's own axis order">
                        <AnchorButton
                            variant="minimal"
                            size="small"
                            icon="reset"
                            text="Reset"
                            disabled={axisOrder.isDefault || fileBrowserStore.isLoadingInfo}
                            onClick={ev => {
                                ev.stopPropagation();
                                fileBrowserStore.resetAxisOrder();
                            }}
                        />
                    </Tooltip>
                </div>
                <Collapse isOpen={this.isOpen} keepChildrenMounted={true}>
                    <div className="axis-order-body">
                        <FormGroup label="X (horizontal)" inline={true}>
                            <HTMLSelect value={`${renderAxes.x}`} options={options} onChange={this.handleAxisChanged("x")} disabled={fileBrowserStore.isLoadingInfo} />
                        </FormGroup>
                        <FormGroup label="Y (vertical)" inline={true}>
                            <HTMLSelect value={`${renderAxes.y}`} options={options} onChange={this.handleAxisChanged("y")} disabled={fileBrowserStore.isLoadingInfo} />
                        </FormGroup>
                        {hasZ && (
                            <FormGroup label="Z (channel)" inline={true} helperText={helperText}>
                                <HTMLSelect value={`${renderAxes.z}`} options={options} onChange={this.handleAxisChanged("z")} disabled={fileBrowserStore.isLoadingInfo} />
                            </FormGroup>
                        )}
                    </div>
                </Collapse>
            </div>
        );
    }
}
