/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/
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
