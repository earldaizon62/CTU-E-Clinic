<?php
require 'config.php';
header('Content-Type: application/json');
echo json_encode(['status' => 'connected']);
?>