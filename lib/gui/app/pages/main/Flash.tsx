/*
 * Copyright 2016 balena.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import CircleSvg from '@fortawesome/fontawesome-free/svgs/solid/circle.svg';
import * as _ from 'lodash';
import * as path from 'path';
import * as React from 'react';
import { Flex, Modal as SmallModal, Txt } from 'rendition';

import * as constraints from '../../../../shared/drive-constraints';
import * as messages from '../../../../shared/messages';
import { ProgressButton } from '../../components/progress-button/progress-button';
import * as availableDrives from '../../models/available-drives';
import * as flashState from '../../models/flash-state';
import * as selection from '../../models/selection-state';
import * as analytics from '../../modules/analytics';
import * as imageWriter from '../../modules/image-writer';
import * as notification from '../../os/notification';
import {
	selectAllTargets,
	TargetSelectorModal,
} from '../../components/target-selector/target-selector';

import FlashSvg from '../../../assets/flash.svg';
import DriveStatusWarningModal from '../../components/drive-status-warning-modal/drive-status-warning-modal';
import * as i18next from 'i18next';

const COMPLETED_PERCENTAGE = 100;
const SPEED_PRECISION = 2;

const getErrorMessageFromCode = (errorCode: string) => {
	// TODO: All these error codes to messages translations
	// should go away if the writer emitted user friendly
	// messages on the first place.
	if (errorCode === 'EVALIDATION') {
		return messages.error.validation();
	} else if (errorCode === 'EUNPLUGGED') {
		return messages.error.driveUnplugged();
	} else if (errorCode === 'EIO') {
		return messages.error.inputOutput();
	} else if (errorCode === 'ENOSPC') {
		return messages.error.notEnoughSpaceInDrive();
	} else if (errorCode === 'ECHILDDIED') {
		return messages.error.childWriterDied();
	}
	return '';
};

function notifySuccess(
	iconPath: string,
	basename: string,
	drives: any,
	devices: { successful: number; failed: number },
) {
	notification.send(
		'Flash complete!',
		messages.info.flashComplete(basename, drives, devices),
		iconPath,
	);
}

function notifyFailure(iconPath: string, basename: string, drives: any) {
	notification.send(
		'Oops! Looks like the flash failed.',
		messages.error.flashFailure(basename, drives),
		iconPath,
	);
}

async function flashImageToDrive(
	isFlashing: boolean,
	goToSuccess: () => void,
): Promise<string> {
	const devices = selection.getSelectedDevices();
	const image: any = selection.getImage();
	const drives = availableDrives.getDrives().filter((drive: any) => {
		return devices.includes(drive.device);
	});

	if (drives.length === 0 || isFlashing) {
		return '';
	}

	const iconPath = 'data:image/png;base64,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';
	const basename = path.basename(image.path);
	try {
		await imageWriter.flash(image, drives);
		if (!flashState.wasLastFlashCancelled()) {
			const {
				results = { devices: { successful: 0, failed: 0 } },
				skip,
				cancelled,
			} = flashState.getFlashResults();
			if (!skip && !cancelled) {
				if (results?.devices?.successful > 0) {
					notifySuccess(iconPath, basename, drives, results.devices);
				} else {
					notifyFailure(iconPath, basename, drives);
				}
			}
			goToSuccess();
		}
	} catch (error: any) {
		notifyFailure(iconPath, basename, drives);
		let errorMessage = getErrorMessageFromCode(error.code);
		if (!errorMessage) {
			error.image = basename;
			analytics.logException(error);
			errorMessage = messages.error.genericFlashError(error);
		}
		return errorMessage;
	} finally {
		availableDrives.setDrives([]);
	}

	return '';
}

const formatSeconds = (totalSeconds: number) => {
	if (typeof totalSeconds !== 'number' || !Number.isFinite(totalSeconds)) {
		return '';
	}
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = Math.floor(totalSeconds - minutes * 60);

	return `${minutes}m${seconds}s`;
};

interface FlashStepProps {
	shouldFlashStepBeDisabled: boolean;
	goToSuccess: () => void;
	isFlashing: boolean;
	style?: React.CSSProperties;
	// TODO: factorize
	step: 'decompressing' | 'flashing' | 'verifying';
	percentage: number;
	position: number;
	failed: number;
	speed?: number;
	eta?: number;
	width: string;
}

export interface DriveWithWarnings extends constraints.DrivelistDrive {
	statuses: constraints.DriveStatus[];
}

interface FlashStepState {
	warningMessage: boolean;
	errorMessage: string;
	showDriveSelectorModal: boolean;
	systemDrives: boolean;
	drivesWithWarnings: DriveWithWarnings[];
}

export class FlashStep extends React.PureComponent<
	FlashStepProps,
	FlashStepState
> {
	constructor(props: FlashStepProps) {
		super(props);
		this.state = {
			warningMessage: false,
			errorMessage: '',
			showDriveSelectorModal: false,
			systemDrives: false,
			drivesWithWarnings: [],
		};
	}

	private async handleWarningResponse(shouldContinue: boolean) {
		this.setState({ warningMessage: false });
		if (!shouldContinue) {
			this.setState({ showDriveSelectorModal: true });
			return;
		}
		this.setState({
			errorMessage: await flashImageToDrive(
				this.props.isFlashing,
				this.props.goToSuccess,
			),
		});
	}

	private handleFlashErrorResponse(shouldRetry: boolean) {
		this.setState({ errorMessage: '' });
		flashState.resetState();
		if (shouldRetry) {
			analytics.logEvent('Restart after failure');
		} else {
			selection.clear();
		}
	}

	private hasListWarnings(drives: any[]) {
		if (drives.length === 0 || flashState.isFlashing()) {
			return;
		}
		return drives.filter((drive) => drive.isSystem).length > 0;
	}

	private async tryFlash() {
		const drives = selection.getSelectedDrives().map((drive) => {
			return {
				...drive,
				statuses: constraints.getDriveImageCompatibilityStatuses(
					drive,
					undefined,
					true,
				),
			};
		});
		if (drives.length === 0 || this.props.isFlashing) {
			return;
		}
		const hasDangerStatus = drives.some((drive) => drive.statuses.length > 0);
		if (hasDangerStatus) {
			const systemDrives = drives.some((drive) =>
				drive.statuses.includes(constraints.statuses.system),
			);
			this.setState({
				systemDrives,
				drivesWithWarnings: drives.filter((driveWithWarnings) => {
					return (
						driveWithWarnings.isSystem ||
						(!systemDrives &&
							driveWithWarnings.statuses.includes(constraints.statuses.large))
					);
				}),
				warningMessage: true,
			});
			return;
		}
		this.setState({
			errorMessage: await flashImageToDrive(
				this.props.isFlashing,
				this.props.goToSuccess,
			),
		});
	}

	public render() {
		return (
			<>
				<Flex
					flexDirection="column"
					alignItems="start"
					width={this.props.width}
					style={this.props.style}
				>
					<FlashSvg
						width="40px"
						className={this.props.shouldFlashStepBeDisabled ? 'disabled' : ''}
						style={{
							margin: '0 auto',
						}}
					/>

					<ProgressButton
						type={this.props.step}
						active={this.props.isFlashing}
						percentage={this.props.percentage}
						position={this.props.position}
						disabled={this.props.shouldFlashStepBeDisabled}
						cancel={imageWriter.cancel}
						warning={this.hasListWarnings(selection.getSelectedDrives())}
						callback={() => this.tryFlash()}
					/>

					{!_.isNil(this.props.speed) &&
						this.props.percentage !== COMPLETED_PERCENTAGE && (
							<Flex
								justifyContent="space-between"
								fontSize="14px"
								color="#7e8085"
								width="100%"
							>
								<Txt>
									{i18next.t('flash.speedShort', {
										speed: this.props.speed.toFixed(SPEED_PRECISION),
									})}
								</Txt>
								{!_.isNil(this.props.eta) && (
									<Txt>
										{i18next.t('flash.eta', {
											eta: formatSeconds(this.props.eta),
										})}
									</Txt>
								)}
							</Flex>
						)}

					{Boolean(this.props.failed) && (
						<Flex color="#fff" alignItems="center" mt={35}>
							<CircleSvg height="1em" fill="#ff4444" />
							<Txt ml={10}>{this.props.failed}</Txt>
							<Txt ml={10}>{messages.progress.failed(this.props.failed)}</Txt>
						</Flex>
					)}
				</Flex>

				{this.state.warningMessage && (
					<DriveStatusWarningModal
						done={() => this.handleWarningResponse(true)}
						cancel={() => this.handleWarningResponse(false)}
						isSystem={this.state.systemDrives}
						drivesWithWarnings={this.state.drivesWithWarnings}
					/>
				)}

				{this.state.errorMessage && (
					<SmallModal
						width={400}
						titleElement={'Attention'}
						cancel={() => this.handleFlashErrorResponse(false)}
						done={() => this.handleFlashErrorResponse(true)}
						action={'Retry'}
					>
						<Txt>
							{this.state.errorMessage.split('\n').map((message, key) => (
								<p key={key}>{message}</p>
							))}
						</Txt>
					</SmallModal>
				)}
				{this.state.showDriveSelectorModal && (
					<TargetSelectorModal
						write={true}
						cancel={() => this.setState({ showDriveSelectorModal: false })}
						done={(modalTargets) => {
							selectAllTargets(modalTargets);
							this.setState({ showDriveSelectorModal: false });
						}}
					/>
				)}
			</>
		);
	}
}
