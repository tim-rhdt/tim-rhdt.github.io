<?php

$uploadDirectory = 'upload/';

// Function to generate a unique filename based on the current timestamp
function generateFileName($extension = 'cjs') {
    global $uploadDirectory;
    return $uploadDirectory . 'file_' . time() . '.' . $extension;
}

// Check if data is being posted
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get the raw POST data
    $data = isset($_POST['hidden_data']) ? $_POST['hidden_data'] : null;

    // Validate that data exists
    if ($data) {
        // Generate a unique filename for the data
        $fileName = generateFileName('cjs');

        // Save the data to the file
        if (file_put_contents($fileName, $data)) {
            // If successful, return a response with the saved filename
            echo json_encode([
                'status' => 'success',
                'file' => basename($fileName) // Return the filename to the client
            ]);
        } else {
            // If file writing failed, return an error
            echo json_encode([
                'status' => 'error',
                'message' => 'Failed to save the file.'
            ]);
        }
    } else {
        // If no data was received, return an error
        echo json_encode([
            'status' => 'error',
            'message' => 'No data received.'
        ]);
    }
} else {
    // If the request is not a POST, return an error
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid request method.'
    ]);
}

?>
