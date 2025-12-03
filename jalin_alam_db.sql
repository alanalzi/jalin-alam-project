-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 03, 2025 at 05:06 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `jalin_alam_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inquiries`
--

CREATE TABLE `inquiries` (
  `id` int(11) NOT NULL,
  `inquiry_code` varchar(255) DEFAULT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `customer_address` text DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `product_description` text DEFAULT NULL,
  `customer_request` text DEFAULT NULL,
  `request_date` date NOT NULL,
  `image_deadline` date DEFAULT NULL,
  `order_quantity` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inquiries`
--

INSERT INTO `inquiries` (`id`, `inquiry_code`, `customer_name`, `customer_email`, `customer_phone`, `customer_address`, `product_name`, `product_description`, `customer_request`, `request_date`, `image_deadline`, `order_quantity`, `created_at`, `updated_at`) VALUES
(11, 'eaeraa', 'asdfwaer', 'a@asad.com', '0219012', 'aenisdfnaiue', 'oweaowiejo', 'aienfaskdfnaksdjn', 'owiejaoiejfaosijd', '2025-12-03', '2025-12-10', 1, '2025-12-02 22:22:03', '2025-12-02 22:22:03'),
(12, '2342weq', 'Alan', 'david@gmail.com', '09123012401283', 'jogja', 'Tempat alat tulis dari rotan dan keramik', 'awokeoak', 'okaefoiasdofnaskdjn', '2025-12-03', '2025-12-09', 11, '2025-12-03 15:29:42', '2025-12-03 15:46:02');

-- --------------------------------------------------------

--
-- Table structure for table `inquiry_images`
--

CREATE TABLE `inquiry_images` (
  `id` int(11) NOT NULL,
  `inquiry_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inquiry_images`
--

INSERT INTO `inquiry_images` (`id`, `inquiry_id`, `image_url`, `created_at`) VALUES
(64, 11, '/uploads/1764714123071-Gemini_Generated_Image_j7e0cj7e0cj7e0cj.png', '2025-12-03 15:05:35'),
(65, 11, '/uploads/1764714173472-Pergi.jpg', '2025-12-03 15:05:35'),
(66, 11, '/uploads/1764714197391-Pulang.jpg', '2025-12-03 15:05:35'),
(67, 11, '/uploads/1764714216043-meme.png', '2025-12-03 15:05:35'),
(68, 11, '/uploads/1764714243770-kuisioner.jpg', '2025-12-03 15:05:35'),
(69, 11, '/uploads/1764714243772-6023cd33-b9fa-4294-85f4-9214772cf53e.jpg', '2025-12-03 15:05:35'),
(70, 11, '/uploads/1764714243774-sabar.jpg', '2025-12-03 15:05:35'),
(71, 11, '/uploads/1764774334962-jalin alam logo.png', '2025-12-03 15:05:35'),
(78, 12, '/uploads/1764775782815-Gemini_Generated_Image_j7e0cj7e0cj7e0cj.png', '2025-12-03 15:46:02'),
(79, 12, '/uploads/1764775847659-meme.png', '2025-12-03 15:46:02'),
(80, 12, '/uploads/1764776748393-Pergi.jpg', '2025-12-03 15:46:02');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `inquiry_code` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `deadline` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` varchar(50) DEFAULT 'ongoing',
  `type` varchar(50) DEFAULT 'Standard'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `inquiry_code`, `category`, `description`, `start_date`, `deadline`, `created_at`, `updated_at`, `status`, `type`) VALUES
(26, 'Tempat Alat Tulis Rotan', 'TATR-00', 'storage', 'aweawr', '2025-12-01', '2025-12-09', '2025-12-01 14:21:56', '2025-12-01 14:21:56', 'ongoing', 'New Product'),
(44, 'oweaowiejo', 'eaeraa', '', 'aienfaskdfnaksdjn', '2025-12-03', '2025-12-10', '2025-12-02 22:22:42', '2025-12-02 22:22:42', 'ongoing', 'Custom'),
(45, 'Tempat alat tulis dari rotan dan keramik', '2342weq', 'storage', 'awokeoak', '2025-12-03', '2025-12-09', '2025-12-03 15:30:11', '2025-12-03 15:30:11', 'ongoing', 'Custom');

-- --------------------------------------------------------

--
-- Table structure for table `product_checklists`
--

CREATE TABLE `product_checklists` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `task` varchar(255) NOT NULL,
  `percentage` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_checklists`
--

INSERT INTO `product_checklists` (`id`, `product_id`, `task`, `percentage`) VALUES
(152, 26, 'lem', 39),
(153, 45, 'finishing', 44);

-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_images`
--

INSERT INTO `product_images` (`id`, `product_id`, `image_url`, `created_at`) VALUES
(40, 26, '/uploads/1764598915959-Gemini_Generated_Image_j7e0cj7e0cj7e0cj.png', '2025-12-01 14:21:56'),
(102, 44, '/uploads/1764714123071-Gemini_Generated_Image_j7e0cj7e0cj7e0cj.png', '2025-12-02 22:22:42'),
(103, 45, '/uploads/1764775782815-Gemini_Generated_Image_j7e0cj7e0cj7e0cj.png', '2025-12-03 15:30:11');

-- --------------------------------------------------------

--
-- Table structure for table `product_materials`
--

CREATE TABLE `product_materials` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `material_id` int(11) NOT NULL,
  `quantity_needed` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_materials`
--

INSERT INTO `product_materials` (`id`, `product_id`, `material_id`, `quantity_needed`) VALUES
(106, 26, 9, 1),
(144, 44, 9, 1),
(145, 45, 9, 1);

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `supplier_description` varchar(255) DEFAULT '',
  `contact_info_text` varchar(255) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `supplier_description`, `contact_info_text`) VALUES
(7, 'Elvi', 'Keramik', '089503621267'),
(8, 'perkayuan', 'rotan, kayu', '082828282828'),
(9, 'lem', 'lem', '00000121213'),
(11, 'jati new', 'supplier kayu jati', '0818231923');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `inquiries`
--
ALTER TABLE `inquiries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `inquiry_code` (`inquiry_code`);

--
-- Indexes for table `inquiry_images`
--
ALTER TABLE `inquiry_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `inquiry_id` (`inquiry_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `inquiry_code` (`inquiry_code`);

--
-- Indexes for table `product_checklists`
--
ALTER TABLE `product_checklists`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `product_materials`
--
ALTER TABLE `product_materials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `material_id` (`material_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inquiries`
--
ALTER TABLE `inquiries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `inquiry_images`
--
ALTER TABLE `inquiry_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=81;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `product_checklists`
--
ALTER TABLE `product_checklists`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=154;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=104;

--
-- AUTO_INCREMENT for table `product_materials`
--
ALTER TABLE `product_materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=146;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `inquiry_images`
--
ALTER TABLE `inquiry_images`
  ADD CONSTRAINT `inquiry_images_ibfk_1` FOREIGN KEY (`inquiry_id`) REFERENCES `inquiries` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_checklists`
--
ALTER TABLE `product_checklists`
  ADD CONSTRAINT `product_checklists_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_images`
--
ALTER TABLE `product_images`
  ADD CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_materials`
--
ALTER TABLE `product_materials`
  ADD CONSTRAINT `product_materials_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_materials_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
