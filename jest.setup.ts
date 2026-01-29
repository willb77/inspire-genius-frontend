import "@testing-library/jest-dom";

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = require("util").TextEncoder;
global.TextDecoder = require("util").TextDecoder;

