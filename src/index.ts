/**
 * Copyright 2024 Wingify Software Pvt. Ltd.
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

import { EvaluationContext, Hook, JsonValue, Logger, Provider, ResolutionDetails } from '@openfeature/server-sdk';

/**
 * Implement the provider interface
 * Construct a VWO Provider fro Openfeature
 * @param client VWO Client to access various APIs
 */
export class VWOProvider implements Provider {
  // Adds runtime validation that the provider is used with the expected SDK
  // public readonly runsOn = 'server';
  private readonly client: any;
  readonly metadata = {
    name: 'vwo-openfeature-provider-node-provider',
  } as const;
  // Optional provider managed hooks
  hooks?: Hook[];
  constructor(vwoClient: any) {
    try {
      this.client = vwoClient;
    } catch (e) {
      console.error(`Encountered unrecoverable initialization error, ${e}`);
    }
  }

  /**
   * Returns the variable value of type boolean for a given feature
   *
   * If variable value is not evaluated, default value will be returned
   *
   * @param flagKey The unique key of the feature flag.
   * @param defaultValue The default value of the variable
   * @param context The context containing user info and variable-key
   * @returns A promise that resolves to a ResolutionDetails having boolean type
   */
  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<boolean>> {
    const getFlag = await this.client.getFlag(flagKey, context);
    const variables = getFlag.getVariables();

    return {
      value: context.key
        ? (variables.find((val) => val.type === 'boolean' && val.key === context.key)?.value || defaultValue)
        : getFlag.isEnabled(),
    };
  }

  /**
   * Returns the variable value of type string for a given feature
   *
   * If variable value is not evaluated, default value will be returned
   *
   * @param flagKey The unique key of the feature flag.
   * @param defaultValue The default value of the variable
   * @param context The context containing user info and variable-key
   * @returns A promise that resolves to a ResolutionDetails having string type
   */
  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<string>> {
    const getFlag = await this.client.getFlag(flagKey, context);
    const variables = getFlag.getVariables();

    return {
      value: variables.find((val) => val.type === 'string' && val.key === context.key)?.value || defaultValue,
    };
  }

  /**
   * Returns the variable value of type number|double for a given feature
   *
   * If variable value is not evaluated, default value will be returned
   *
   * @param flagKey The unique key of the feature flag.
   * @param defaultValue The default value of the variable
   * @param context The context containing user info and variable-key
   * @returns A promise that resolves to a ResolutionDetails having number|double type
   */
  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<number>> {
    const getFlag = await this.client.getFlag(flagKey, context);
    const variables = getFlag.getVariables();

    return {
      value:
        variables.find((val) => (val.type === 'integer' || val.type === 'double') && val.key === context.key)?.value ||
        defaultValue,
    };
  }

  /**
   * Returns the variable value of type JSON for a given feature
   *
   * If variable value is not evaluated, return defaultValue
   * If variable value is evaluated but variable-key is not provided inside context,
   *  return all the variables
   * Otherwise, default value will be returned
   *
   * @param flagKey The unique key of the feature flag.
   * @param defaultValue The default value of the variable
   * @param context The context containing user info and variable-key
   * @returns A promise that resolves to a ResolutionDetails having JSON type
   */
  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<T>> {
    const getFlag = await this.client.getFlag(flagKey, context);
    const variables = getFlag.getVariables() || defaultValue;
    return {
      value: context.key ? variables.find((val) => val.type === 'json' && val.key === context.key)?.value || defaultValue : variables,
    };
  }

  /**
   * Return VWO Client instance created and used by this openfeature VWO provider
   *
   * @returns The client for this provider.
   */
  public getClient(): any {
    return this.client;
  }
}
