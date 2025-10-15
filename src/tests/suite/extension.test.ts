import * as assert from 'assert';
import { setup, suite, test } from 'mocha';
import * as vscode from 'vscode';

import { extSuffix, extensionId } from '../../constants';
import { Commands, Settings } from '../../enums';

type Command = {
  title: string;
  command: string;
  category: string;
};

type ConfigurationProperty = {
  type: string | string[];
  default?: any;
  description?: string;
  enum?: string[];
  enumDescriptions?: string[];
  deprecationMessage?: string;
  markdownDescription?: string;
};

type Configuration = {
  type: string;
  title: string;
  properties: Record<string, ConfigurationProperty>;
};

export type EnumIndexer = Record<string, string>;

suite('Extension Tests', function () {
  let extension: vscode.Extension<any>;

  setup(function () {
    const ext = vscode.extensions.getExtension(extensionId);
    if (!ext) {
      throw new Error('Extension was not found.');
    }
    if (ext) {
      extension = ext;
    }
  });

  /**
   * Because we are waiting on a process to complete in the background
   * we use the `done` function to inform mocha that this test run is
   * complete.
   */
  test('Extension loads in VSCode and is active', function (done) {
    setTimeout(function () {
      assert.equal(extension.isActive, true);
      done();
    }, 200);
  });

  test('constants.Commands exist in package.json', function () {
    const commandCollection: Command[] = extension.packageJSON.contributes.commands;
    for (let command in Commands) {
      const result = commandCollection.some((c) => c.command === (Commands as any)[command]);
      assert.ok(result);
    }
  });

  test('constants.Settings exist in package.json', function () {
    const config: Configuration = extension.packageJSON.contributes.configuration;
    const properties = Object.keys(config.properties);
    for (let setting in Settings) {
      const result = properties.some((property) => property === `${extSuffix}.${(Settings as any)[setting]}`);
      assert.ok(result);
    }
  });

  test('package.json commands registered in extension', function (done) {
    const commandStrings: string[] = extension.packageJSON.contributes.commands.map((c: Command) => c.command);

    vscode.commands.getCommands(true).then((allCommands: string[]) => {
      const commands: string[] = allCommands.filter((c) => c.startsWith(`${extSuffix}.`));
      commands.forEach((command) => {
        const result = commandStrings.some((c) => c === command);
        assert.ok(result);
      });
      done();
    });
  });
});
