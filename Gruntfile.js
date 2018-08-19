module.exports = function (grunt) {
    grunt.initConfig({
        clean: ["dist/*"],
        concat: {
            all: {
                src: ['src/*.js'],
                dest: 'dist/fractal-canopy.js'
            }
        },
        jshint: {
            file: ['src/*.js'],
            options: {
                'esversion': 6
            }
        },
        uglify: {
            all: {
                src: ['dist/fractal-canopy.js'],
                dest: 'dist/fractal-canopy.min.js'
            }
        },
        watch: {
            files: ["src/*.js"],
            tasks: ["default"]
        }
    });

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-uglify-es");
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['clean', 'concat', 'jshint', 'uglify', 'watch']);
};