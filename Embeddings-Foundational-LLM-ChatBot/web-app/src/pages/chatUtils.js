// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

// Permission is hereby granted, free of charge, to any person obtaining a copy of this
// software and associated documentation files (the "Software"), to deal in the Software
// without restriction, including without limitation the rights to use, copy, modify,
// merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR Anp
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// --
// --  Author:        Jin Tan Ruan
// --  Date:          04/11/2023
// --  Purpose:       Util Functions
// --  Version:       0.1.0
// --  Disclaimer:    This code is provided "as is" in accordance with the repository license
// --  History
// --  When        Version     Who         What
// --  -----------------------------------------------------------------
// --  04/11/2023  0.1.0       jtanruan    Initial
// --  -----------------------------------------------------------------
// --

let resetChatFunction = null;
let resetDocumentFunction = null;
let resetModelFunction = null;
let callback = null;
let callbackOne = null;

export function setResetChatFunction(fn) {
  resetChatFunction = fn;
}

export function resetChat() {
  if (resetChatFunction) {
    resetChatFunction();
  }
}

export function setResetDocumentFunction(fn) {
  resetDocumentFunction = fn;
}

export function resetDocument() {
  if (resetDocumentFunction) {
    resetDocumentFunction();
  }
}

export function setCallback(cb) {
  callback = cb;
}

export function sendValue(value) {
  if (callback) {
    callback(value);
  }
}

export function setCallbackOne(cbOne) {
  callbackOne = cbOne;
}

export function sendValueOne(valueOne) {
  if (callbackOne) {
    callbackOne(valueOne);
  }
}

export function setResetModelFunction(fn) {
  resetModelFunction = fn;
}

export function resetModel() {
  if (resetModelFunction) {
    resetModelFunction();
  }
}
