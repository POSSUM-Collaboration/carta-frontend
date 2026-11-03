import * as React from "react";
import {AnchorButton, Checkbox, Collapse, FormGroup, HTMLSelect, Intent, Switch, Tooltip} from "@blueprintjs/core";
import {action, makeObservable, observable} from "mobx";
import {observer} from "mobx-react";

import {SafeNumericInput} from "components/Shared";
import {AppStore, HEALPIX_FRAMES, HEALPIX_PROJECTIONS} from "stores";

import "./HealpixOptionsComponent.scss";

/**
 * Settings for reprojecting a HEALPix map when it is opened: projection, frame, centre, pixel scale, grid size,
 * interpolation, columns, or the grid of an already open image. Shown in the file browser for HEALPix files.
 */
@observer
export class HealpixOptionsComponent extends React.Component {
    @observable isOpen: boolean = true;

    constructor(props: any) {
        super(props);
        makeObservable(this);
    }

    @action private toggleOpen = () => {
        this.isOpen = !this.isOpen;
    };

    private handleProjectionChanged = (ev: React.ChangeEvent<HTMLSelectElement>) => {
        AppStore.Instance.fileBrowserStore.healpixOptions.setProjection(ev.currentTarget.value);
    };

    private handleFrameChanged = (ev: React.ChangeEvent<HTMLSelectElement>) => {
        AppStore.Instance.fileBrowserStore.healpixOptions.setFrame(ev.currentTarget.value);
    };

    private handleMatchChanged = (ev: React.ChangeEvent<HTMLSelectElement>) => {
        const fileId = parseInt(ev.currentTarget.value);
        AppStore.Instance.fileBrowserStore.healpixOptions.setMatchImage(fileId >= 0, fileId);
    };

    render() {
        const appStore = AppStore.Instance;
        const fileBrowserStore = appStore.fileBrowserStore;
        const options = fileBrowserStore.healpixOptions;
        const columns = fileBrowserStore.healpixColumns;
        const isMatching = options.shouldMatchImage && options.matchFileId >= 0;

        const matchOptions = [{value: "-1", label: "None (use the projection below)"}, ...appStore.frames.map(frame => ({value: `${frame.frameInfo.fileId}`, label: frame.filename}))];
        const selectedColumns = options.columns.length ? options.columns : columns;

        return (
            <div className="healpix-options">
                <div className="healpix-options-header" onClick={this.toggleOpen}>
                    <AnchorButton variant="minimal" size="small" icon={this.isOpen ? "chevron-down" : "chevron-right"} />
                    <span className="healpix-options-title">HEALPix reprojection</span>
                    <Tooltip content="Re-read the file info with these settings, to preview the resulting image size and WCS">
                        <AnchorButton
                            variant="minimal"
                            size="small"
                            icon="refresh"
                            text="Update info"
                            disabled={fileBrowserStore.isLoadingInfo}
                            onClick={ev => {
                                ev.stopPropagation();
                                fileBrowserStore.refreshHealpixFileInfo();
                            }}
                        />
                    </Tooltip>
                </div>
                <Collapse isOpen={this.isOpen} keepChildrenMounted={true}>
                    <div className="healpix-options-body">
                        <FormGroup label="Match to image" inline={true} helperText={isMatching ? "The map is reprojected onto that image's pixel grid and WCS" : undefined}>
                            <HTMLSelect value={isMatching ? `${options.matchFileId}` : "-1"} options={matchOptions} onChange={this.handleMatchChanged} disabled={!appStore.frames.length} />
                        </FormGroup>
                        <FormGroup label="Projection" inline={true}>
                            <HTMLSelect value={options.projection} options={HEALPIX_PROJECTIONS.map(p => ({value: p.value, label: p.label}))} onChange={this.handleProjectionChanged} disabled={isMatching} />
                        </FormGroup>
                        <FormGroup label="Frame" inline={true}>
                            <HTMLSelect value={options.frame} options={HEALPIX_FRAMES} onChange={this.handleFrameChanged} disabled={isMatching} />
                        </FormGroup>
                        <FormGroup label="Centre" inline={true} helperText={options.isZenithal && !options.hasCenter ? "Zenithal projections should be given a centre" : undefined}>
                            <Switch checked={options.hasCenter} onChange={ev => options.setHasCenter(ev.currentTarget.checked)} disabled={isMatching} inline={true} />
                            <SafeNumericInput
                                className="healpix-centre-input"
                                value={options.centerLon}
                                min={-360}
                                max={360}
                                stepSize={1}
                                minorStepSize={0.01}
                                onValueChange={(lon: number) => options.setCenter(lon, options.centerLat)}
                                disabled={isMatching || !options.hasCenter}
                                rightElement={<span className="healpix-unit">° lon</span>}
                            />
                            <SafeNumericInput
                                className="healpix-centre-input"
                                value={options.centerLat}
                                min={-90}
                                max={90}
                                stepSize={1}
                                minorStepSize={0.01}
                                onValueChange={(lat: number) => options.setCenter(options.centerLon, lat)}
                                disabled={isMatching || !options.hasCenter}
                                rightElement={<span className="healpix-unit">° lat</span>}
                            />
                        </FormGroup>
                        <FormGroup label="Pixel scale" inline={true} helperText="0 = native HEALPix resolution">
                            <SafeNumericInput
                                value={options.pixelScaleArcmin}
                                min={0}
                                stepSize={1}
                                minorStepSize={0.01}
                                onValueChange={options.setPixelScaleArcmin}
                                disabled={isMatching}
                                rightElement={<span className="healpix-unit">arcmin</span>}
                            />
                        </FormGroup>
                        <FormGroup label="Size" inline={true} helperText="0 = cover the sky">
                            <SafeNumericInput
                                value={options.width}
                                min={0}
                                stepSize={64}
                                intOnly={true}
                                onValueChange={(width: number) => options.setSize(width, options.height)}
                                disabled={isMatching}
                                rightElement={<span className="healpix-unit">× </span>}
                            />
                            <SafeNumericInput
                                value={options.height}
                                min={0}
                                stepSize={64}
                                intOnly={true}
                                onValueChange={(height: number) => options.setSize(options.width, height)}
                                disabled={isMatching}
                                rightElement={<span className="healpix-unit">px</span>}
                            />
                        </FormGroup>
                        <FormGroup label="Interpolation" inline={true}>
                            <Switch checked={options.isBilinear} onChange={ev => options.setBilinear(ev.currentTarget.checked)} label={options.isBilinear ? "Bilinear" : "Nearest pixel"} />
                        </FormGroup>
                        {columns.length > 1 && (
                            <FormGroup label="Columns" inline={true} helperText="I/Q/U/V columns become a polarization axis">
                                <div className="healpix-columns">
                                    {columns.map(column => (
                                        <Checkbox key={column} label={column} checked={selectedColumns.includes(column)} onChange={() => options.toggleColumn(column, columns)} inline={true} />
                                    ))}
                                </div>
                            </FormGroup>
                        )}
                        {!options.isDefault && <AnchorButton variant="minimal" size="small" intent={Intent.NONE} icon="reset" text="Reset to defaults" onClick={options.reset} />}
                    </div>
                </Collapse>
            </div>
        );
    }
}
