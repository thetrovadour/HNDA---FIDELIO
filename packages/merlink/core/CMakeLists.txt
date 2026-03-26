cmake_minimum_required(VERSION 3.16)
project(merlink_core LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# MerL1nk Core library
add_library(merlink_core
    src/bloom_filter.cpp
    src/murmurhash3.cpp
)
target_include_directories(merlink_core PUBLIC include)

# Tests
enable_testing()
add_executable(bloom_filter_test tests/bloom_filter_test.cpp)
target_link_libraries(bloom_filter_test merlink_core)
add_test(NAME bloom_filter_test COMMAND bloom_filter_test)
