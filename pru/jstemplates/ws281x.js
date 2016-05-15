var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var bbbPinData_1 = require("../bbbPinData");
var common_1 = require("./common");
var WS281xProgram = (function (_super) {
    __extends(WS281xProgram, _super);
    function WS281xProgram(PRU_NUM, overallChannelCount) {
        _super.call(this, PRU_NUM, overallChannelCount);
        this.pruChannelCount = Math.floor(overallChannelCount / 2);
        bbbPinData_1.pinIndex.applySingleDataPinMapping(this.pruChannelCount);
        console.error("Using " + this.pruChannelCount + " channels on PRU" + PRU_NUM);
    }
    WS281xProgram.prototype.fileHeader = function () {
        this.emitComment("//////////////////////////////////////////////////////////////////////////////////////////////////////");
        this.emitComment("WS281x Mapping for PRU" + this.PRU_NUM);
        this.emitComment("Overall Channels: " + this.overallChannelCount);
        this.emitComment("PRU Channels: " + this.pruChannelCount);
        this.emitComment("//////////////////////////////////////////////////////////////////////////////////////////////////////");
    };
    WS281xProgram.prototype.frameCode = function () {
        var _this = this;
        var g = this;
        // Bit timings from http://wp.josh.com/2014/05/13/ws2812-neopixels-are-not-so-finicky-once-you-get-to-know-them/
        var ZERO_PULSE_NS = 180; // 200 - 350 - 500
        var ONE_PULSE_NS = 500; // 550 - 700 - 5,500
        var INTERBIT_NS = 375; // 450 - 600 - 6,000
        var INTERFRAME_NS = 6000;
        g.pruBlock(function () {
            var l_word_loop = g.emitLabel("l_word_loop");
            // Load all the data.
            g.LOAD_CHANNEL_DATA(g.pruPins[0], 0, _this.pruChannelCount);
            // Store the data register in the unused bits of the data registers so it can be used for one of the
            // GPIO banks
            g.MOV(g.r_data0.b3, g.r_data_addr.b0);
            g.MOV(g.r_data1.b3, g.r_data_addr.b1);
            g.MOV(g.r_data2.b3, g.r_data_addr.b2);
            g.MOV(g.r_data3.b3, g.r_data_addr.b3);
            // for bit in 24 to 0
            g.emitComment("Loop over the 24 bits in a word");
            g.MOV(g.r_bit_num, 24);
            g.pruBlock(function () {
                var l_bit_loop = "l_bit_loop";
                g.emitLabel(l_bit_loop);
                g.DECREMENT(g.r_bit_num);
                g.r_bit_regs.forEach(function (reg) {
                    g.MOV(reg, 0);
                });
                g.groupByBank(g.pruPins, function (pins, gpioBank, usedBankIndex, usedBankCount) {
                    // Set mask bits for the ZERO bits
                    pins.forEach(function (pin) {
                        g.TEST_BIT_ZERO(pin, g.r_bit_regs[gpioBank]);
                    });
                });
                g.WAITNS(ZERO_PULSE_NS + ONE_PULSE_NS, "one_bits_wait");
                g.PINS_LOW(g.pruPins);
                g.WAITNS(ZERO_PULSE_NS + ONE_PULSE_NS + INTERBIT_NS, "interbit_wait");
                g.RESET_COUNTER();
                g.PINS_HIGH(g.pruPins);
                g.WAITNS(ZERO_PULSE_NS, "zero_bits_wait");
                g.groupByBank(g.pruPins, function (pins, gpioBank, usedBankIndex, usedBankCount) {
                    g.PREP_GPIO_FOR_CLEAR(gpioBank);
                    g.APPLY_GPIO_CHANGES(g.r_bit_regs[gpioBank]);
                });
                g.QBNE(l_bit_loop, g.r_bit_num, 0);
            });
            // Restore the data pointers from the data registers.
            g.MOV(g.r_data_addr.b0, g.r_data0.b3);
            g.MOV(g.r_data_addr.b1, g.r_data1.b3);
            g.MOV(g.r_data_addr.b2, g.r_data2.b3);
            g.MOV(g.r_data_addr.b3, g.r_data3.b3);
            // The RGB streams have been clocked out
            // Move to the next pixel on each row
            g.ADD(g.r_data_addr, g.r_data_addr, 48 * 4);
            g.DECREMENT(g.r_data_len);
            g.QBNE(l_word_loop, g.r_data_len, 0);
        });
        g.WAITNS_REL(ONE_PULSE_NS, "one_bits_wait_end");
        g.PINS_LOW(g.pruPins);
        //g.SLEEPNS(INTERFRAME_NS, "interframe_wait");
    };
    return WS281xProgram;
})(common_1.BaseSetupPruProgram);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WS281xProgram;
//# sourceMappingURL=ws281x.js.map