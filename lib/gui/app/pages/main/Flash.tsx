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

	const iconPath =
		'data:image/png;base64,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';
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
