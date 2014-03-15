
/**
 * @fileOverview A collection of usefull functions
*/

'use strict';

/**
 * Remove whitespace from the beginning and end of the string
 * @return {string} - the trimmed string
 */
String.prototype.trim = function()
{
	return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
};

/**
 * Split a string every separator, except when the part is quotted (with ' or " not escaped)
 * @param {char} delimiter - the delimiter that will break each string
 * @return {string[]} - array of strings created by splitting the string parameter on boundaries formed by the delimiter
 */
String.prototype.splitUnquotted = function(delimiter)
{
	var out = [];
	out[0] = '';
	var stringMode = false;
	for (var i = 0; i < this.length; i++) {
		if(stringMode)
		{
			if(this[i] == stringMode && this[i-1] != '\\')
			{
				stringMode = false;
			}
			out[out.length-1] += this[i];
		}
		else
		{
			if(this[i] == delimiter) {
				out[out.length] = '';
			}
			else if(this[i] == '\'' || this[i] == '"')
			{
				out[out.length-1] += this[i];
				stringMode = this[i];
			}
			else {
				out[out.length-1] += this[i];
			}
		}
	}
	return out;
};

// Array Remove - By 

/**
 * Remove an item – or a group of items – from an array
 * @param {int} from - the first element to be deleted in the array
 * @param {int} [to] - the last element to be deleted. If not set only the first will be deleted
 * @return {array} - the array without removed items
 * @author John Resig (MIT Licensed)
 */
Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};


/**
 * Insert values inside an array at a specified index
 * @param {int} index - The index where value will be inserted
 * @param {...*} values - values that will be inserted to the array
 * @return {array} - the array with inserted items
 * @author VisioN : http://stackoverflow.com/questions/586182/insert-item-into-array-at-a-specific-index#answer-15621345
 * @example
 * array.insert(index, value1, value2, ..., valueN)
 */
Array.prototype.insert = function(index) {
	this.splice.apply(this, [index, 0].concat(
		Array.prototype.slice.call(arguments, 1)));
	return this;
};

/**
 * Get all "get parameters" into an assoc array
 * @return {array} - the assoc array with each params
 */
function getPageParameters() {
	var out = [];
	//Get parameter string
	var paramStr = window.location.search.substr(1);
	if(paramStr === null && paramStr === '') {
		return out;
	}

	//transform to assoc array
	var paramList = paramStr.split('&');
	var param;
	for (var i = 0; i < paramList.length; i++) {
		param = paramList[i].split('=');
		out[param[0]] = param[1];
	}
	return out;
}
