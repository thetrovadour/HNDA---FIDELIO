cmake_minimum_required(VERSION 3.16)
project(merlink_core LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

find_package(CURL REQUIRED)
find_package(Threads REQUIRED)

# MerL1nk Core library
add_library(merlink_core
    src/bloom_filter.cpp
    src/murmurhash3.cpp
    src/retry_queue.cpp
    src/email_parser.cpp
)
target_include_directories(merlink_core PUBLIC include)
target_include_directories(merlink_core PRIVATE ${CURL_INCLUDE_DIRS})
target_link_libraries(merlink_core
    PRIVATE ${CURL_LIBRARIES}
    PRIVATE Threads::Threads
)

# Tests
enable_testing()

add_executable(bloom_filter_test tests/bloom_filter_test.cpp)
target_link_libraries(bloom_filter_test merlink_core Threads::Threads)
add_test(NAME bloom_filter_test COMMAND bloom_filter_test)

add_executable(retry_queue_test tests/retry_queue_test.cpp)
target_link_libraries(retry_queue_test merlink_core Threads::Threads)
add_test(NAME retry_queue_test COMMAND retry_queue_test)

add_executable(email_parser_test tests/email_parser_test.cpp)
target_link_libraries(email_parser_test merlink_core Threads::Threads)
add_test(NAME email_parser_test COMMAND email_parser_test)
