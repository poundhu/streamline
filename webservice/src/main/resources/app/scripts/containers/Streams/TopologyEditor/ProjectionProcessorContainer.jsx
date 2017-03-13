/**
  * Copyright 2017 Hortonworks.
  *
  * Licensed under the Apache License, Version 2.0 (the "License");
  * you may not use this file except in compliance with the License.
  * You may obtain a copy of the License at
  *   http://www.apache.org/licenses/LICENSE-2.0
  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS,
  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  * See the License for the specific language governing permissions and
  * limitations under the License.
**/

import React, {
  Component,
  PropTypes
} from 'react';
import ReactDOM, {
  findDOMNode
} from 'react-dom';
import Select from 'react-select';
import TopologyREST from '../../../rest/TopologyREST';
import AggregateUdfREST from '../../../rest/AggregateUdfREST';
import Utils from '../../../utils/Utils';
import FSReactToastr from '../../../components/FSReactToastr';
import {
  toastOpt
} from '../../../utils/Constants';
import CommonNotification from '../../../utils/CommonNotification';
import {Scrollbars} from 'react-custom-scrollbars';

export default class ProjectionProcessorContainer extends Component {

  static propTypes = {
    nodeData: PropTypes.object.isRequired,
    editMode: PropTypes.bool.isRequired,
    nodeType: PropTypes.string.isRequired,
    topologyId: PropTypes.string.isRequired,
    versionId: PropTypes.number.isRequired,
    sourceNode: PropTypes.object.isRequired,
    targetNodes: PropTypes.array.isRequired,
    linkShuffleOptions: PropTypes.array.isRequired,
    currentEdges: PropTypes.array.isRequired
  };

  constructor(props) {
    super(props);
    this.fetchDataAgain = false;
    let {editMode} = props;
    this.fieldsArr = [];
    this.streamIdList = [];
    this.argumentErrorArr = [];
    this.tempStreamContextData = {};
    var obj = {
      editMode: editMode,
      fieldList: [],
      outputFieldsArr: [
        {
          functionName: '',
          args: [],
          outputFieldName: ''
        }
      ],
      functionListArr: [],
      argumentError: false,
      outputStreamFields: [],
      invalidInput : false,
      projectionKeys : [],
      projectionSelectedKey : [],
      argumentKeysGroup : []
    };
    this.state = obj;
  }

  /*
    componentWillUpdate has been call very frequently in react ecosystem
    this.context.ParentForm.state has been SET through the API call in ProcessorNodeForm
    And we need to call fetchData after the Parent has set its state so that inputStreamOptions are available
    to used.
    And this condition save us from calling three API
    1] get edge
    2] get streams
    3] get Node data with config.
  */
  componentWillUpdate() {
    if(this.context.ParentForm.state.inputStreamOptions.length > 0 && !(this.fetchDataAgain)){
      this.fetchData();
    }
  }

  /*
    fetchData Method is call once on componentWillUpdate after the this.context.ParentForm SET its state.
    1] getAllUdfs API is call
    And only typeOf "FUNCTION" are been fetch from the udfList and SET to fieldList
    These variables are set from the ParentForm...
    this.projectionNode = this.context.ParentForm.state.processorNode.
    inputStreamFromContext = this.context.ParentForm.state.inputStreamOptions.

    If the rules ID is not present in this.projectionNode
    we create a dummy rules for the processor and set the rules Id
    And if rules ID is present
    we call this.populateOutputStreamsFromServer Method to update the UI with pre populate fields.
  */
  fetchData = () => {
    const {
      topologyId,
      versionId,
      nodeType,
      nodeData,
      currentEdges,
      targetNodes
    } = this.props;

    let promiseArr = [
      AggregateUdfREST.getAllUdfs()
    ];

    Promise.all(promiseArr).then((resultArr) => {
      this.fetchDataAgain = true;
      // catch error resultArr
      resultArr.map((result) => {
        if(result.responseMessage !== undefined){
          FSReactToastr.error(
            <CommonNotification flag="error" content={results.responseMessage}/>, '', toastOpt);
        }
      });

      // get the ProcessorNode from parentForm Context
      this.projectionNode = this.context.ParentForm.state.processorNode;
      this.configFields = this.projectionNode.config.properties;
      this.projectionRuleId = this.configFields.rules;

      //Gather all "Function" functions only
      let udfList = Utils.populateFieldsArr(resultArr[0].entities , "FUNCTION");

      // get the inputStream from parentForm Context
      const inputStreamFromContext = this.context.ParentForm.state.inputStreamOptions;
      let fields = [];
      inputStreamFromContext.map((result, i) => {
        this.streamIdList.push(result.streamId);
        fields.push(...result.fields);
      });
      this.fieldsArr = Utils.getSchemaFields(_.unionBy(fields,'name'), 0,false);
      let stateObj = {
        fieldList: JSON.parse(JSON.stringify(this.fieldsArr)),
        functionListArr: udfList
      };

      if(this.projectionRuleId){
        this.fetchRulesNode(this.projectionRuleId).then((ruleNode) => {
          this.projectionRulesNode = ruleNode;
          this.populateOutputStreamsFromServer(this.projectionRulesNode);
        });
      } else {
        //Creating projection object so output streams can get it
        let dummyProjectionObj = {
          name: 'projection_auto_generated',
          description: 'projection description auto generated',
          projections: [],
          streams: [this.streamIdList[0]],
          actions: [],
          outputStreams: []
        };
        TopologyREST.createNode(topologyId, versionId, "rules", {body: JSON.stringify(dummyProjectionObj)}).then((rulesNode) => {
          this.projectionRulesNode = rulesNode;
          this.projectionRuleId = rulesNode.id;
          this.projectionNode.config.properties.rules = [this.projectionRuleId];
          TopologyREST.updateNode(topologyId, versionId, nodeType, nodeData.nodeId, {
            body: JSON.stringify(this.projectionNode)
          });
        });
      }
      this.setState(stateObj);
    });
  }

  /*
    populateOutputStreamsFromServer Method accept the Object send from the fetchData
    When the ProjectionProcessor has been already configured
    And we set all the defaultvalue, which we got from there serverStreamObj

    This include Nested fields spliting and populating the pre value for each and every fields on UI
    And SET in state object
  */
  populateOutputStreamsFromServer(serverStreamObj){
    if(serverStreamObj.projections.length > 0){
      const {fieldList} = this.state;
      let keyArrObj = [],argsFieldsArrObj = [],argsGroupKeys=[];
      serverStreamObj.projections.map(o => {
        if (o.expr) {
          if (o.expr.search('\\[') !== -1) {
            let a = o.expr.replace("['", " ").replace("']", " ").split(' ');
            if (a.length > 1) {
              o.expr = a[a.length - 1] != ''
                ? a[a.length - 1]
                : a[a.length - 2];
            } else {
              o.expr = a[0];
            }
          }
          keyArrObj.push(this.getKeyList(o.expr));
        } else {
          let argsArr = [];
          if(_.isArray(o.args)){
            _.map(o.args,(arg) => {
              if (arg.search('\\[') !== -1) {
                let a = arg.replace("['", " ").replace("']", " ").split(' ');
                if (a.length > 1) {
                  arg = a[a.length - 1] != ''
                    ? a[a.length - 1]
                    : a[a.length - 2];
                } else {
                  arg = a[0];
                }
              }
              argsArr.push(arg);
            });
          }
          o.args = argsArr;
          argsFieldsArrObj.push(o);
        }
      });

      // populate argumentFieldGroupKey
      _.map(argsFieldsArrObj, (obj, index) => {
        if(_.isArray(obj.args)){
          let _arr = [];
          _.map(obj.args , (o) => {
            const fieldObj = this.getKeyList(o);
            _arr.push(fieldObj);
          });
          const {keys,gKeys} = Utils.getKeysAndGroupKey(_arr);
          argsGroupKeys[index] = gKeys;
        }
      });

      const {keys,gKeys} = Utils.getKeysAndGroupKey(keyArrObj);
      const keyData = Utils.createSelectedKeysHierarchy(keyArrObj,fieldList);
      const outputFieldsObj =  this.generateOutputFields(argsFieldsArrObj,0);

      const tempFields = _.concat(keyData,argsFieldsArrObj);
      let mainStreamObj = {
        streamId : serverStreamObj.streams[0],
        fields : this.generateOutputFields(tempFields,0)
      };

      // assign mainStreamObj value to "this.tempStreamContextData" make available for further methods
      this.tempStreamContextData = mainStreamObj;
      this.setState({outputFieldsArr :argsFieldsArrObj,outputStreamFields: outputFieldsObj,projectionKeys:keys,projectionSelectedKey:keyData,projectionGroupByKeys : gKeys,argumentKeysGroup :argsGroupKeys});
      this.context.ParentForm.setState({outputStreamObj: mainStreamObj});
    }
  }

  /*
    fetchRulesNode Method accept the ruleId
    To get the Rules node through API call
  */
  fetchRulesNode(ruleId){
    const {
      topologyId,
      versionId
    } = this.props;
    return TopologyREST.getNode(topologyId, versionId, 'rules', ruleId);
  }

  /*
    renderFieldOption Method accept the node from the select2
    And modify the Select2 view list with nested look
  */
  renderFieldOption(node) {
    let styleObj = {
      paddingLeft: (10 * node.level) + "px"
    };
    if (node.disabled) {
      styleObj.fontWeight = "bold";
    }
    return (
      <span style={styleObj}>{node.name}</span>
    );
  }

  /*
    validateData check the validation of
     argumentError,projectionKeys and outputFieldsArr array
  */
  validateData(){
    let validData = [];
    const {outputFieldsArr,argumentError,projectionKeys} = this.state;
    if(argumentError || projectionKeys.length === 0){
      return false;
    }
    _.map(outputFieldsArr, (field) => {
      _.map(_.keys(field), (key) => {
        if(_.isArray(field[key])){
          field[key].length === 0 ? validData.push(false) :'';
        }else{
          field[key] === "" ? validData.push(false)  : '';
        }
      });
    });
    return validData.length > 0 ? false : true;
  }

  /*
    generateOutputFields Method accept the array of object and level[NUMBER] for NESTED fields
    And it modify the fields into new Object with returnType
  */
  generateOutputFields(fields, level) {
    return fields.map((field) => {
      let obj = {
        name: field.name || field.outputFieldName ,
        type: field.type || this.getReturnType(field.functionName, this.getKeyList(field.args))
      };

      if (field.type === 'NESTED' && field.fields) {
        obj.fields = this.generateOutputFields(field.fields, level + 1);
      }
      return obj;
    });
  }

  /*
    updateProcessorNode Method accept name,description send by handleSave Method
    projectionSelectedKey AND outputStreamFields has been  concat array for outputStreams
    tempOutputFields is the result of the above concat array
    this.generateOutputFields call on tempOutputFields and the result has been added to
    this.projectionNode.outputStreams
    And the processorNode is updated
  */
  updateProcessorNode(name, description){
    const {outputStreamFields,projectionSelectedKey} = this.state;
    const {topologyId, versionId,nodeType,nodeData} = this.props;
    const tempOutputFields = _.concat(projectionSelectedKey,outputStreamFields);
    const streamFields = this.generateOutputFields(tempOutputFields, 0);
    if(this.projectionNode.outputStreams.length > 0){
      this.projectionNode.outputStreams.map((s) => {
        s.fields = streamFields;
      });
    }else{
      _.map(this.outputStreamStringArr , (s) => {
        this.projectionNode.outputStreams.push({
          streamId: s,
          fields: streamFields
        });
      });
    }
    this.projectionNode.description = description;
    return TopologyREST.updateNode(topologyId, versionId, nodeType, this.projectionNode.id, {body: JSON.stringify(this.projectionNode)});
  }

  /*
    handleSave Method is responsible for ProjectionProcessor
    projectionGroupByKeys is modify with {expr : fields} obj;
    argumentKeysGroup is added to each and every tempArr[index].args
    Rules Node has been updated in this call

    updateProcessorNode Method is a callback
  */
  handleSave(name, description){
    if(this.projectionRuleId){
      const {projectionSelectedKey,argumentKeysGroup,projectionGroupByKeys} = this.state;
      let tempArr = _.cloneDeep(this.state.outputFieldsArr);
      const {topologyId, versionId,nodeType,nodeData} = this.props;
      _.map(tempArr, (temp,index) => {
        tempArr[index].args = argumentKeysGroup[index];
      });
      const exprObj = projectionGroupByKeys.map((field) => {return {expr: field};});
      const mergeTempArr = _.concat(tempArr,exprObj);

      this.projectionRulesNode.projections = mergeTempArr;
      this.outputStreamStringArr = [
        'projection_transform_stream_'+this.projectionNode.id,
        'projection_notifier_stream_'+this.projectionNode.id
      ];
      this.projectionRulesNode.outputStreams = this.outputStreamStringArr;
      return TopologyREST.updateNode(topologyId, versionId, 'rules', this.projectionRuleId, {body: JSON.stringify(this.projectionRulesNode)}).then((processorResult) => {
        return this.updateProcessorNode(name, description);
      });
    }
  }

  /*
    getReturnType Method accept the params
    Param@ functionName
    Param@ fieldObj
    Param@ index

    And it check the returnType is support in the argument array of the fieldObj
    if argList is empty then it return fieldObj.type and call this.checkArgumentError to show Error on UI
    else 'DOUBLE' as default;
  */
  getReturnType(functionName, fieldObj, index) {
    let obj = this.state.functionListArr.find((o) => {
      return o.name === functionName;
    });
    if (obj) {
      if (obj.argTypes) {
        if (fieldObj) {
          let argList = obj.argTypes.toString().includes(fieldObj.type);
          (argList)
            ? this.checkArgumentError(false,fieldObj.name,index)
            : this.checkArgumentError(true,fieldObj.name,index);
        }
        return obj.returnType || fieldObj.type;
      }
    } else if (fieldObj) {
      return fieldObj.type;
    } else {
      return 'DOUBLE';
    }
  }

  /* checkArgumentError Method accept flag = boolean , fieldName = "string" , index = any number
     if the flag is true it push the fieldName in this.argumentErrorArr and set argumentError = true
     to show the Error on UI
     if the flag is false it get the diffCheck between the this.argumentErrorArr and outputFieldsArr
     and if diffCheck and outputFieldsArr are both identical it set argumentError = false, this.argumentErrorArr = [];
  */
  checkArgumentError(flag,fieldName,index){
    const {outputFieldsArr} = this.state;
    if(flag){
      const indexVal = _.findIndex(this.argumentErrorArr ,(x) => x === fieldName);
      indexVal !== -1 ? '' : this.argumentErrorArr.push(fieldName);
      this.setState({argumentError : true});
    }else{
      const diffCheck = _.difference(outputFieldsArr[index].args, this.argumentErrorArr);
      if(diffCheck.length === outputFieldsArr[index].args.length){
        this.argumentErrorArr = [];
        this.setState({argumentError : false});
      }
    }
  }

  /*
    getKeyList Method accept the argName
    And return the obj matches in fieldList
  */
  getKeyList(argName){
    let fieldObj = this.state.fieldList.find((field) => {
      return field.name === argName;
    });
    return fieldObj;
  }

  /*
    handleProjectionKeysChange Method accept arr of obj
    And SET
    projectionKeys : key of arr used on UI for listing
    projectionGroupByKeys : group the projectionKeys
    projectionSelectedKey : store the obj of the projectionKeys
  */
  handleProjectionKeysChange(arr){
    let {fieldList,outputStreamFields,projectionSelectedKey} = this.state;
    const keyData = Utils.createSelectedKeysHierarchy(arr,fieldList);
    this.tempStreamContextData.fields = outputStreamFields.length > 0  ? _.concat(keyData , outputStreamFields) : keyData;

    const {keys,gKeys} = Utils.getKeysAndGroupKey(arr);
    this.setState({projectionKeys: keys, projectionGroupByKeys: gKeys, projectionSelectedKey: keyData});
    this.context.ParentForm.setState({outputStreamObj: this.tempStreamContextData});
  }

  /*
    handleFieldChange Method accept index, obj
    And SET functionName of outputFieldsArr
  */
  handleFieldChange(index, obj) {
    if(obj){
      let tempArr = _.cloneDeep(this.state.outputFieldsArr);
      tempArr[index].functionName = obj.name;
      this.setState({outputFieldsArr : tempArr}, () => {
        this.setParentContextOutputStream(index);
      });
    }
  }

  /*
    handleFieldsKeyChange Method accept index,arr of OBJECT
    argumentKeysGroup is SET in this method for further use in handlesave
  */
  handleFieldsKeyChange(index,arr){
    const {fieldList,argumentKeysGroup } = this.state;
    let argumentGroupArr = _.cloneDeep(argumentKeysGroup);
    let tempArr = _.cloneDeep(this.state.outputFieldsArr);
    const fieldData = Utils.createSelectedKeysHierarchy(arr,fieldList);
    const {keys,gKeys} = Utils.getKeysAndGroupKey(arr);
    tempArr[index].args = keys;
    argumentGroupArr[index]= gKeys;
    this.setState({outputFieldsArr : tempArr, argumentKeysGroup : argumentGroupArr}, () => {
      this.setParentContextOutputStream(index);
    });
  }

  /*
    handleFieldNameChange Method accept index and event of Input
    And set outputFieldName
  */
  handleFieldNameChange(index,event){
    let tempArr = _.cloneDeep(this.state.outputFieldsArr);
    let showErr = false;
    if(event.target.value === ""){
      showErr = true;
    }
    tempArr[index].outputFieldName = event.target.value;
    this.setState({invalidInput : showErr,outputFieldsArr : tempArr}, () => {
      this.setParentContextOutputStream(index);
    });
  }

  /*
    This Mehods call from [handleFieldNameChange,handleFieldsKeyChange,handleFieldChange] FUNCTIONS
    setParentContextOutputStream Mehod accept index and update the fields
    With local state and parentContext also;
    And Two array is concat to make the outputStreamObj of parentContext
  */
  setParentContextOutputStream(index) {
    let funcReturnType = "";
    const {outputFieldsArr,projectionSelectedKey} = this.state;
    let mainObj = _.cloneDeep(this.state.outputStreamFields);
    if(outputFieldsArr[index].args.length > 0 && (outputFieldsArr[index].functionName !== undefined && outputFieldsArr[index].functionName !== "")){
      _.map(outputFieldsArr[index].args, (arg) => {
        // set the returnType for function
        funcReturnType = this.getReturnType(outputFieldsArr[index].functionName, this.getKeyList(arg),index);
      });
    }
    mainObj[index] = {
      name: (outputFieldsArr[index].outputFieldName !== undefined && outputFieldsArr[index].outputFieldName !== "") ? outputFieldsArr[index].outputFieldName : "",
      type:  funcReturnType ? funcReturnType : ""
    };
    // create this.tempStreamContextData obj to save in ParentForm context
    const tempStreamData = _.concat(projectionSelectedKey,mainObj);
    this.tempStreamContextData = {fields : tempStreamData  , streamId : this.streamIdList[0]};
    this.setState({outputStreamFields : mainObj});
    this.context.ParentForm.setState({outputStreamObj: this.tempStreamContextData});
  }

  /*
    addProjectionOutputFields Method add the row on UI with blank text
  */
  addProjectionOutputFields() {
    if (this.state.editMode) {
      const el = document.querySelector('.processor-modal-form ');
      const targetHt = el.scrollHeight;
      Utils.scrollMe(el, (targetHt + 100), 2000);

      let fieldsArr = this.state.outputFieldsArr;
      fieldsArr.push({functionName: '',args: '',  outputFieldName: ''});
      this.setState({outputFieldsArr: fieldsArr});
    }
  }

  /*
    deleteProjectionRow Method accept the index
    And delete to fields from the two Array [outputFieldsArr , outputStreamFields]
  */
  deleteProjectionRow(index){
    const {projectionSelectedKey} = this.state;
    let fieldsArr = _.cloneDeep(this.state.outputFieldsArr);
    let mainOutputFields = _.cloneDeep(this.state.outputStreamFields);

    fieldsArr.splice(index,1);
    mainOutputFields.splice(index,1);

    const tempStreamData = _.concat(projectionSelectedKey,mainOutputFields);
    this.tempStreamContextData.fields = tempStreamData;
    this.setState({outputFieldsArr : fieldsArr,outputStreamFields : mainOutputFields});
    this.context.ParentForm.setState({outputStreamObj: this.tempStreamContextData});
  }

  render() {
    let {
      selectedKeys,
      fieldList,
      editMode,
      outputFieldsArr,
      functionListArr,
      outputStreamId,
      argumentError,
      invalidInput,
      projectionKeys
    } = this.state;

    return (
      <div className="modal-form processor-modal-form">
        <Scrollbars autoHide renderThumbHorizontal={props => <div {...props} style={{
          display: "none"
        }}/>}>
        <form className="customFormClass">
          <div className="form-group">
            <label>Projection Fields
              <span className="text-danger">*</span>
            </label>
            <div>
              <Select  value={projectionKeys} options={fieldList} onChange={this.handleProjectionKeysChange.bind(this)} clearable={false} multi={true} required={true} disabled={!editMode} valueKey="name" labelKey="name" optionRenderer={this.renderFieldOption.bind(this)}/>
            </div>
          </div>
          <div className="form-group">
            <div className="row">
              <div className="col-sm-12">
                {(argumentError)
                  ? <label className="color-error">The Projection Function is not supported by input</label>
                  : ''
  }
              </div>
            </div>
            <div className="row">
              <div className="col-sm-3 outputCaption">
                <label>Function</label>
              </div>
              <div className="col-sm-4 outputCaption">
                <label>Arguments</label>
              </div>
              <div className="col-sm-3 outputCaption">
                <label>Fields Name</label>
              </div>
            </div>
            {outputFieldsArr.map((obj, i) => {
              return (
                <div key={i} className="row form-group">
                  <div className="col-sm-3">
                    <Select className={outputFieldsArr.length === i
                      ? "menu-outer-top"
                      : ''} value={obj.functionName} options={functionListArr} onChange={this.handleFieldChange.bind(this, i)} required={true} disabled={!editMode} valueKey="name" labelKey="name"/>
                  </div>
                  <div className="col-sm-4">
                    <Select className={outputFieldsArr.length === i
                      ? "menu-outer-top"
                      : ''} value={obj.args} options={fieldList} onChange={this.handleFieldsKeyChange.bind(this, i)} clearable={false} multi={true} required={true} disabled={!editMode} valueKey="name" labelKey="name" optionRenderer={this.renderFieldOption.bind(this)}/>
                  </div>
                  <div className="col-sm-3">
                    <input name="outputFieldName" value={obj.outputFieldName} ref="outputFieldName" onChange={this.handleFieldNameChange.bind(this, i)} type="text" className={invalidInput ? "form-control invalidInput" : "form-control" }  required={true} disabled={!editMode}/>
                  </div>
                  {editMode
                    ? <div className="col-sm-2">
                        <button className="btn btn-default btn-sm" type="button" onClick={this.addProjectionOutputFields.bind(this)}>
                          <i className="fa fa-plus"></i>
                        </button>&nbsp; {i > 0
                          ? <button className="btn btn-sm btn-danger" type="button" onClick={this.deleteProjectionRow.bind(this, i)}>
                              <i className="fa fa-trash"></i>
                            </button>
                          : null}
                      </div>
                    : null}
                </div>
              );
            })}
          </div>
        </form>
        </Scrollbars>
      </div>
    );
  }
}

ProjectionProcessorContainer.contextTypes = {
  ParentForm: React.PropTypes.object
};
