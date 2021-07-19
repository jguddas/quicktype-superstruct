import React from 'react'
import json5 from 'json5'
import Page, { InputType } from './Page'
import './App.css';
import '@tabler/core/dist/css/tabler.css';
import TsBlazeTargetLanguage from './language'
import {
  quicktype,
  InputData,
  TargetLanguage,
  JSONSchemaInput,
  FetchingJSONSchemaStore,
  jsonInputForTargetLanguage
} from "quicktype-core";

const formatJson = (inp:string):string => JSON.stringify(json5.parse(inp), null, 2)

const EXAMPLE_JSON5 = formatJson(`
{
  greeting: 'Welcome to quicktype!',
  instructions: [
    'Type or paste JSON here',
    'Or choose a sample above',
    'quicktype will generate code in your',
    'chosen language to parse the sample data'
  ]
}
`).trim()

const EXAMPLE_JSON_SCHEMA = formatJson(`
{
  id: 'http://json-schema.org/geo',
  $schema: 'http://json-schema.org/draft-06/schema#',
  description: 'A geographical coordinate',
  type: 'object',
  required: [ 'latitude', 'longitude' ],
  properties: {
    latitude: { type: 'number' },
    longitude: { type: 'number' }
  }
}
`).trim()

const EXAMPLES:{[key in InputType]:string} = {
  json5: EXAMPLE_JSON5,
  jsonShema: EXAMPLE_JSON_SCHEMA
}

const addDefaultType = (str:string) => str.replace(
  /export default is(.*);/,
  'export type $1 = blaze.InferValidatorType<typeof is$1>;\n\n$&'
)

const parseJson = async (str: string):Promise<any> => {
  try {
    return json5.parse(str)
  } catch (e) {
    throw new Error('Invalid input!')
  }
}

const quicktypeJSON = async (
  targetLanguage: TargetLanguage | string,
  inputName: string,
  str: string
):Promise<string> => {
  const jsonInput = jsonInputForTargetLanguage(targetLanguage);

  await jsonInput.addSource({
    name: inputName,
    samples: [JSON.stringify(await parseJson(str))],
  });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  const result = await quicktype({
    inputData,
    lang: targetLanguage,
  });

  return addDefaultType(result.lines.join('\n'))
}

const quicktypeJSONSchema = async (
  targetLanguage: TargetLanguage | string,
  inputName: string,
  str: string
):Promise<string> => {
  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());

  await schemaInput.addSource({
    name: inputName,
    schema: JSON.stringify(await parseJson(str))
  });

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  const result = await quicktype({
    inputData,
    lang: targetLanguage,
  });

  return addDefaultType(result.lines.join('\n'))
}

const parseInput = async (
  str: string,
  name: string,
  inputType: InputType
):Promise<string> => {
  if (!str) return ''
  const targetLanguage = new TsBlazeTargetLanguage()
  switch (inputType) {
    case 'json5':
      return quicktypeJSON(targetLanguage, name, str)
    case 'jsonShema':
      return quicktypeJSONSchema(targetLanguage, name, str)
  }

}

function App({ defaultInputType = 'json5' }: { defaultInputType?: InputType }) {
  const [input, setInput] = React.useState(EXAMPLES[defaultInputType])
  const [inputName, setInputName] = React.useState('example')
  const [inputType, setInputType] = React.useState(defaultInputType)
  const [output, setOutput] = React.useState('')
  const changeOutput = React.useCallback(() => {}, [])
  const changeInputType = React.useCallback((t:InputType) => {
    setInputType(t)
    if (!input || input === EXAMPLES[inputType]) {
      setInput(EXAMPLES[t])
    }
  }, [ input, inputType ])
  const formatInput = React.useCallback(() => {
    try {
      setInput(formatJson(input))
    } catch (e) {}
  }, [input])
  React.useEffect(() => {
    setOutput('Loading…')
    parseInput(input, inputName, inputType).then(setOutput, setOutput)
  },[ input, inputName, inputType, setOutput ])
  return (
    <Page
      input={input}
      inputName={inputName}
      inputType={inputType}
      output={output}
      onChangeInput={setInput}
      onBlurInput={formatInput}
      onChangeInputType={changeInputType}
      onChangeInputName={setInputName}
      onChangeOutput={changeOutput}
    />
  );
}

export default App;
