let defaultAddress = location.hash? location.hash.replace("#","") : '0x404d4FfB1887aA8Ca5973B4F1C5257DE4d887D59'
let splitAddresses = defaultAddress.split(';')
if (splitAddresses.length > 1) {
  defaultAddress = splitAddresses[0]
}
const ETHERSCAN_API = 'GC2Q118AB2HIYZZFN25CQ956VEQUFVZIII'
window.defaultAddress = defaultAddress

var ERC20Contract
const ethEnabled = (cb) => {
  if (window.web3) {
    window.web3 = new Web3(window.web3.currentProvider);
    window.ethereum.enable();
    web3.eth.net.getNetworkType((err, network)=>{
      window.chainId = Number(network === "main" ? 1 : 4)
      web3.eth.getAccounts().then((accounts)=>{
        web3.eth.defaultAccount = accounts[0]
        return cb(true)
      })
    })    
  }
  return cb(false);
}
window.ethEnabled = ethEnabled;
function handleFunctionButtonClick(e) {
  let functionTarget = $($(e.target).parent().parent()[0]).attr('id')
  let functionPropertyTargets = $($(e.target).parent()[0]).siblings().find("input")
  let responseTarget = $($($(e.target).parents()[1]).siblings()[0]).find(".output")
  let functionMap = propertyIdToFunctionMap(functionTarget)
  responseTarget.text('Loading...')
  // console.log('function', functionMap.name)
  let properties = []
  functionPropertyTargets.each((index, target) => {
    let id = $(target).attr('id')
    let propertyMap = propertyIdToFunctionMap(id, false)
    propertyMap.value = $(target).val()
    properties.push(propertyMap.value)
    // console.log("propertyTarget", id, $(target).val())
  })
  let cb = (err, out) => {
    // console.log(out, typeof out)
    switch (typeof out) {
      case "boolean":
      case "string":
        break;
      case "object":
        if (out && !out.transactionHash) {
          out = out.toJSON();
        } else if (out && out.transactionHash){
          out = out.transactionHash
        } else {
          out = err || "Unknown Error"
        }              
        break;
      case "function":
        break;
    }
    let outputs = funcs.filter(func => { return func.name === functionMap.name })[functionMap.index].outputs
    typeof out == 'function'? responseTarget.html(err ? err.message : out()): responseTarget.text(err ? err.message : out)
    // console.log(out, outputs)
  }
  // properties.push(cb)
  let func = contract.methods[functionTarget].apply(contract.methods[functionTarget], Array.prototype.slice.call(properties, 0))
  let functionType = funcs.filter(func=>{return func.name === functionTarget})[0].stateMutability
  let isAddress = funcs.filter(func=>{return func.name === functionTarget})[0].outputs[0].type == 'address'
  if (functionType === "view") {
    func.call().then((results, err)=>{
      if (isAddress) {
        let old = results
        results = function(){ return "<a target='_blank' href='https://emblemlabs.github.io/ConfigurableERC20/#"+old+"'>"+old+"</a>"}
      }
      return cb(err, results)
    }).catch(err=>{
      return cb(err, null)
    })
  } else {
    func.send({from: web3.eth.defaultAccount}).then((results, err)=>{
      return cb(err, results)
    }).catch(err=>{
      return cb(err, null)
    })
  }
  // func.call().then((results, err)=>{
  //   return cb(err, results)
  // })
  // window.cb = (err, out)=>{console.log('out', out, err)}
  // console.log("properties", properties)

}
window.handleFunctionButtonClick = handleFunctionButtonClick

function propertyIdToFunctionMap(target, includeIndex = true) {
  let _property = {}
  target.split('-').forEach(prop => {
    let props = prop.split('[')
    includeIndex ? _property.index = 0 : null
    _property.name = props[0]
    if (props.length > 1 && includeIndex) {
      _property.index = Number(props[1].replace(']', ''))
      //console.log("ADD INDEX", Number(props[1].replace(']','')))
    }
  })
  return _property
}
window.propertyIdToFunctionMap = propertyIdToFunctionMap

function autoExecViewFunctions() {
  $(".fun-btn").each((index, element) => {
    let buttonElement = $(element)
    let functionName = $(element).attr('id').replace('btn-', '')
    let filtered = funcs.filter(func => { return func.name === functionName })
    let isView = filtered[0].stateMutability === "view"
    if (isView && filtered[0].inputs.length === 0) {
      // console.log("Clicking", functionName, filtered[0].inputs.length)
      handleFunctionButtonClick({ target: $(buttonElement) })
    }
    // console.log(isView, functionName, buttonElement)
  })
}

function assignEvents(cb){
  $("body").off("click");
  $("body").on("click", ".fun-btn", handleFunctionButtonClick)
  $("body").on("click", "#load-button", changeContractContext)
  $("#contract-address").val(splitAddresses.length > 1? splitAddresses[0]:defaultAddress)
  
  window.tokenAbi ? $("#abiTextArea").val(JSON.stringify(tokenAbi)) : null
  window.contractDetails ? $("#codeArea").html(contractDetails.SourceCode) : null
  window.contractDetails ? $(".contractName").text(contractDetails.ContractName) : null
//   $("body").on('change','#abiTextArea', (e)=>{
//     let abi = JSON.parse($(e.currentTarget).val())
//     let retVal = {SourceCode: '', ABI: JSON.stringify(abi), ContractName: 'Custom Load'}
//     let address = $("#contract-address").val()
//     console.log(retVal)
//     window.contractDetails = retVal
//     if (abi != ''){
//         loadContract(address, abi, ()=>{
//             console.log("Re Initiating")
//             assignEvents(()=>{
//                 handleWork()
//             })                      
//         })
//     }    
//   })
  return cb()
}
window.assignEvents = assignEvents
let workTimeout;

function handleWork() {
  if (!window.tokenAbi) {
    console.log("Loading ABI...")
    workTimeout = setTimeout(handleWork, 500)
    window.workTimeout = workTimeout
    return workTimeout
  }
  
  let funcs = window.tokenAbi.filter(item => { return item.type === "function" }).map(func => {
    func.formattedName = unCamelCase(func.name)
    let width
    switch (true) {
      case func.formattedName.length <= 7:
        width = 1
        break;
      case func.formattedName.length > 7 && func.formattedName.length <= 13:
        width = 2
        break;
      default:
        width = 3
        break;
    }
    func.formattedNameWidth = width
    // console.log(func.formattedNameWidth, func.formattedName)
    func.inputs = func.inputs.map(input => {
      input.width = Math.floor((12 - width) / func.inputs.length)
      return input
    })
    return func
  })
  funcs = funcs.map(_function => {
    let functions = funcs.filter(f => { return f.name === _function.name })
    if (functions.length > 1) {
      let filteredFunctionInputs = functions.map(f => { return JSON.stringify(f.inputs) })
      let currentInputsString = JSON.stringify(_function.inputs)
      let index = filteredFunctionInputs.indexOf(currentInputsString)
      // console.log('internal loop inputs', currentInputsString, index)
      // console.log('functions', filteredFunctionInputs)
      _function.index = index
    }
    return _function
  })
  let readFuncs = funcs.filter(func=>{ return func.stateMutability === "view"})
  let writeFuncs = funcs.filter(func=>{ return func.stateMutability !== "view"})
  var template = document.getElementById('function-list-template').innerHTML;
  var renderFunctions = Handlebars.compile(template);
  document.getElementById('read-function-list').innerHTML = renderFunctions({
    functions: readFuncs
  });
  document.getElementById('write-function-list').innerHTML = renderFunctions({
    functions: writeFuncs
  });
  window.funcs = funcs;
  setTimeout(()=>{
    assignEvents(()=>{
      autoExecViewFunctions()
    })    
  }, 500) 
  // ()

}
window.handleWork = handleWork

function loadContract(address, abi, cb){
  var contract = new web3.eth.Contract(abi, address);
  // var contract = ERC20Contract.at(address)
  window.tokenAbi = abi
  window.contract = contract
  return cb()
}

function changeContractContext() {
  let address = splitAddresses.length > 1? splitAddresses[1] : $("#contract-address").val()
  defaultAddress = address
  window.defaultAddress = defaultAddress
  let prefix = chainId === 1 ? '' : '-rinkeby'
  $.getJSON('https://api'+prefix+'.etherscan.io/api?module=contract&action=getsourcecode&address='+ address + '&apikey='+ETHERSCAN_API, function (data) {
      var contractABI = "";
      if (data.status === "1") {
        contractABI = data.result[0].ABI
        if ( contractABI === 'Contract source code not verified') {
          return handleError(contractABI)
        } else {
          contractABI = JSON.parse(contractABI)
          window.contractDetails = data.result[0]
          if (contractABI != ''){
            loadContract(splitAddresses.length > 1? splitAddresses[0]: address, contractABI, ()=>{
              console.log("Re Initiating")
              assignEvents(()=>{
                handleWork()
              })                      
            })
          } else {
              return handleError(data)
          }
        }        
      } else {
        return handleError("Unknown error")
      }                  
  })
  function handleError(data) {
    $("#read-function-list").text(data ? data : "Unknown error")
    $("#write-function-list").text(data ? data : "Unknown error")
    clearTimeout(window.workTimeout)
    assignEvents(()=>{})
  }
}
window.changeContractContext = changeContractContext

function downloadSourceCode(address, cb) {
  let prefix = chainId === 1 ? '' : '-rinkeby'
  $.getJSON('https://api'+prefix+'.etherscan.io/api?module=contract&action=getsourcecode&address='+ address + '&apikey='+ETHERSCAN_API, function (data) {
    return cb(data)
  })
}
window.downloadSourceCode = downloadSourceCode

window.loadContract = loadContract

async function getLocalAbi(location, cb) {
  let abi = await $.get(location)
  return cb(abi)
}

$("#contract-address").val(defaultAddress)
ethEnabled((enabled)=>{
  if (enabled) {
//     let splitAddresses = defaultAddress.split(';')
//     if (splitAddresses.length > 1) {
//         console.log("SPlit")
//         defaultAddress = splitAddresses[0]
//         let prefix = chainId === 1 ? '' : '-rinkeby'
//         $.getJSON('https://api'+prefix+'.etherscan.io/api?module=contract&action=getsourcecode&address='+ splitAddresses[1] + '&apikey='+ETHERSCAN_API, function (data) {
//             if (data.status === "1") {
//                 console.log(data.result[0].ABI)
//                 let json = data.result[0].ABI
//                 $("#abiTextArea").val(json)
//                 $("#abiTextArea").val(JSON.stringify(json))
//                 $("#abiTextArea").trigger("change")
//             }
//         })
//     } else {
      changeContractContext()
//     }    
  }
})
