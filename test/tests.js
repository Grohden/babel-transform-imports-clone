import assert from 'assert';
import * as babel from '@babel/core';
import path from 'path';

function createOptions({
  preventFullImport,
  transform = 'react-bootstrap/lib/${member}',
  skipDefaultConversion,
  importAliases = {},
  libraryName = 'react-bootstrap'
}) {
  return {
    [libraryName]: { transform, preventFullImport, skipDefaultConversion, importAliases }
  };
};

function transform(code, options = createOptions({})) {
  return babel.transform(code, {
    presets: [['@babel/preset-env', { modules: false }]],
    plugins: [['./index', options]]
  }).code;
}

describe('import transformations', function () {
  it('should handle default imports', function () {
    const code = transform(`import Bootstrap from 'react-bootstrap';`);
    assert.equal(code, "import Bootstrap from 'react-bootstrap';");
  });

  it('should handle namespace imports', function () {
    const code = transform(`import * as Bootstrap from 'react-bootstrap';`);
    assert.equal(code, "import * as Bootstrap from 'react-bootstrap';");
  });

  it('should handle member imports', function () {
    const code = transform(`import { Grid, Row as row } from 'react-bootstrap';`);
    assert.equal(code, [
      'import Grid from "react-bootstrap/lib/Grid";',
      'import row from "react-bootstrap/lib/Row";',
    ].join("\n"))
  });

  it('should handle renamed imports', function () {
    const options = createOptions({
      skipDefaultConversion: true,
      importAliases: {
        'Row': 'RowN'
      }
    })
    const code = transform(`import { Row } from 'react-bootstrap';`, options);
    assert.equal(code, [
      'import { RowN as Row } from "react-bootstrap/lib/Row";',
    ].join("\n"))
  });

  it('should handle a mix of member and default import styles', function () {
    const code = transform(`import Bootstrap, { Grid, Row as row } from 'react-bootstrap';`);
    assert.equal(code, [
      'import Bootstrap from "react-bootstrap";',
      'import Grid from "react-bootstrap/lib/Grid";',
      'import row from "react-bootstrap/lib/Row";',
    ].join("\n"))
  });

  it('should handle relative filenames', function () {
    const libraryName = path.join(__dirname, '../local/path');
    const _transform = path.join(__dirname, '../local/path/${member}');
    const options = createOptions({ libraryName, transform: _transform })
    const code = transform(`import { LocalThing } from './local/path'`, options);

    // The slash replaces below are for cross platform compatibility
    assert.equal(code.replace(/\\\\/g, '/'), `import LocalThing from "${libraryName.replace(/\\/g, '/')}/LocalThing";`);
  });

  it('should handle relative files with regex expressions', function () {
    const libraryName = '((\.{1,2}\/?)*)\/local\/path';
    const _transform = '${1}/local/path/${member}';
    const options = createOptions({ libraryName, transform: _transform })
    const code = transform(`import { LocalThing } from '../../local/path'`, options);
    assert.equal(code, 'import LocalThing from "../../local/path/LocalThing";');
  });

  it('should handle regex expressions', function () {
    const libraryName = 'package-(\\w+)\/?(((\\w*)?\/?)*)';
    const _transform = 'package-${1}/${2}/${member}';
    const options = createOptions({ libraryName, transform: _transform })
    const code = transform(`import { LocalThing } from 'package-one/local/path'`, options);
    assert.equal(code, 'import LocalThing from "package-one/local/path/LocalThing";')
  });
});

describe('transform as function', function () {
  it('should call the transform as a function when provided as so', function () {
    const options = createOptions({ transform: function (input) { return `path/${input}`; } });

    const code = transform(`import { somePath } from 'react-bootstrap';`, options);

    assert.notEqual(code.indexOf('path/somePath'), -1, 'function should transform somePath to path/somePath');
  });
});

describe('preventFullImport plugin option', function () {
  it('should throw on default imports when truthy', function () {
    const options = createOptions({ preventFullImport: true });

    assert.throws(() => { transform(`import Bootstrap from 'react-bootstrap';`, options) });
  });

  it('should throw on namespace imports when truthy', function () {
    const options = createOptions({ preventFullImport: true });

    assert.throws(() => { transform(`import * as Bootstrap from 'react-bootstrap';`, options) });
  });

  it('should not throw on member imports when truthy', function () {
    const options = createOptions({ preventFullImport: true });

    assert.doesNotThrow(() => { transform(`import { Grid, Row as row } from 'react-bootstrap';`, options) });
  });
});

describe('skipDefaultConversion plugin option', function () {
  it('should retain named import syntax when enabled', function () {
    const options = createOptions({ skipDefaultConversion: true });

    const code = transform(`import { Grid, Row as row } from 'react-bootstrap';`, options);

    assert.equal(code.indexOf('_interopRequireDefault'), -1, 'skipDefaultConversion should not allow conversion to default import');
  })
});

describe('edge cases', function () {
  it('should throw when transform plugin option is missing', function () {
    const options = createOptions({ transform: null });

    assert.throws(() => { transform(`import Bootstrap from 'react-bootstrap';`, options) });
  });
});
