/*
 * Copyright 2017 balena.io
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

import * as errors from './errors';

export function isValidPercentage(percentage: any): boolean {
	return typeof percentage === 'number' && percentage >= 0 && percentage <= 100;
}

export function percentageToFloat(percentage: any) {
	if (!isValidPercentage(percentage)) {
		throw errors.createError({
			title: `Invalid percentage: ${percentage}`,
		});
	}
	return percentage / 100;
}

export async function delay(duration: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
}

export function isJson(jsonString: string) {
	try {
		JSON.parse(jsonString);
	} catch (e) {
		return false;
	}
	return true;
}
