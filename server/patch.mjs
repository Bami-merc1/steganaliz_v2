// Restores util.isNullOrUndefined removed in Node 16+
// @tensorflow/tfjs-node still calls this internally
import util from 'util';
if (typeof util.isNullOrUndefined === 'undefined') {
  util.isNullOrUndefined = (value) => value === null || value === undefined;
}