export type InputType = 'json5' | 'jsonShema'

type PageProps = {
  input: string
  output: string
  inputName: string,
  inputType: InputType,
  onChangeInputType: (str: InputType) => void
  onBlurInput: () => void
  onChangeInput: (str: string) => void
  onChangeInputName: (str: string) => void
  onChangeOutput: (str: string) => void
}

function Page({
  input,
  output,
  inputType,
  inputName,
  onBlurInput,
  onChangeInput,
  onChangeInputType,
  onChangeInputName,
  onChangeOutput
}:PageProps) {
  return (
    <div className="wrapper">
        <div className="page-wrapper">
          <div className="page-body">
            <div className="container-xl mb-3">
              <div className="page-header d-print-none">
                <h2 className="page-title">
                  quicktype ts-blaze
                </h2>
              </div>
            </div>
            <div className="container-xl">
              <div className="card" style={{ overflow: 'hidden' }}>
                <div className="row">
                  <div
                    className="col col-12 col-sm-12 col-md-6"
                    style={{
                      paddingRight: 0,
                      borderRight: '1px solid rgba(101, 109, 119, 0.16)'
                    }}
                  >
                    <div className="card-header d-flex">
                      <h3 className="card-title" style={{ flexGrow: 1 }}>
                        Input
                      </h3>
                      <input
                        type="text"
                        value={inputName}
                        className="form-control mx-2"
                        style={{ flexBasis: 150 }}
                        onChange={(e) => onChangeInputName(e.target.value)}
                      />
                      <select
                        name="inputType"
                        className="form-select"
                        style={{ flexBasis: 150 }}
                        onChange={(e) => onChangeInputType(e.target.value as InputType)}
                      >
                        <option
                          value="json5"
                          selected={inputType === 'json5'}
                        >
                          JSON
                        </option>
                        <option
                          value="jsonShema"
                          selected={inputType === 'jsonShema'}
                        >
                          JSON Schema
                        </option>
                      </select>
                    </div>
                    <div className="card-body">
                      <textarea
                        value={input}
                        className="form-control"
                        style={{ minHeight: '20rem' }}
                        onChange={(e) => onChangeInput(e.target.value)}
                        onBlur={() => onBlurInput()}
                      />
                    </div>
                  </div>
                  <div className="col col-12 col-sm-12 col-md-6" style={{ paddingLeft: 0 }}>
                    <div className="card-header">
                      <h3 className="card-title">
                        Output
                      </h3>
                      <input
                        disabled
                        type="text"
                        className="form-control"
                        style={{ opacity: 0 }}
                      />
                    </div>
                    <div className="card-body">
                      <textarea
                        value={output}
                        onChange={(e) => onChangeOutput(e.target.value)}
                        className="form-control"
                        style={{ minHeight: '20rem', backgroundColor: '#f4f6fa' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}

export default Page;
