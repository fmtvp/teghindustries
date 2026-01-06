        let currentUser = null;

        function showLogin() {
            hideAllPages();
            document.getElementById('login-form').classList.remove('hidden');
        }

        function showSignup() {
            hideAllPages();
            document.getElementById('signup-form').classList.remove('hidden');
        }

        function showDashboard() {
            hideAllPages();
            document.getElementById('dashboard').classList.remove('hidden');
            updateNavbar();
        }

        function showMyPurchases() {
            hideAllPages();
            document.getElementById('my-purchases').classList.remove('hidden');
            loadMyPurchases();
        }

        function showVoucherGenerator() {
            hideAllPages();
            document.getElementById('voucher-generator').classList.remove('hidden');
            loadCoursesForVoucher();
        }

        function showVoucherHistory() {
            hideAllPages();
            document.getElementById('voucher-history').classList.remove('hidden');
            loadVoucherHistory();
        }

        function showCourseManager() {
            hideAllPages();
            document.getElementById('course-manager').classList.remove('hidden');
            loadCoursesManagement();
        }

        function showLanding() {
            hideAllPages();
            document.getElementById('landing-page').classList.remove('hidden');
            loadFeaturedCourses();
        }

        function showAllCourses() {
            showLogin();
        }

        function hideAllPages() {
            document.getElementById('landing-page').classList.add('hidden');
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('signup-form').classList.add('hidden');
            document.getElementById('dashboard').classList.add('hidden');
            document.getElementById('my-purchases').classList.add('hidden');
            document.getElementById('voucher-generator').classList.add('hidden');
            document.getElementById('voucher-history').classList.add('hidden');
            document.getElementById('course-manager').classList.add('hidden');
        }

        function updateNavbar() {
            if (currentUser) {
                document.getElementById('nav-buttons').classList.add('hidden');
                if (currentUser.audienceType === 'internal') {
                    document.getElementById('admin-nav').classList.remove('hidden');
                    document.getElementById('user-nav').classList.add('hidden');
                } else {
                    document.getElementById('user-nav').classList.remove('hidden');
                    document.getElementById('admin-nav').classList.add('hidden');
                }
            } else {
                document.getElementById('nav-buttons').classList.remove('hidden');
                document.getElementById('admin-nav').classList.add('hidden');
                document.getElementById('user-nav').classList.add('hidden');
            }
        }

        function showMessage(message, type = 'success') {
            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
            setTimeout(() => messagesDiv.innerHTML = '', 5000);
        }

        async function signup() {
            const username = document.getElementById('signup-username').value;
            const password = document.getElementById('signup-password').value;

            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                if (response.ok) {
                    showMessage('Account created successfully! Please login.');
                    showLogin();
                } else {
                    showMessage(data.error, 'error');
                }
            } catch (error) {
                showMessage('Network error', 'error');
            }
        }

        async function login() {
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                if (response.ok) {
                    currentUser = { username, audienceType: data.audienceType };
                    showDashboard();
                    loadCourses();
                    if (currentUser.audienceType === 'internal') {
                        loadAdminPanel();
                    }
                } else {
                    showMessage(data.error, 'error');
                }
            } catch (error) {
                showMessage('Network error', 'error');
            }
        }

        async function loadCourses() {
            try {
    const response = await fetch('/api/courses');
    const data = await response.json();
    
    // Filter out hint object and get only courses
    const courses = data.filter(item => !item.hint);
    
    const coursesHtml = courses.map(course => `
        <div class="course-card ${course.type}">
            <h3>${course.title}</h3>
            <p><strong>Course ID:</strong> ${course.id}</p>
            <p><strong>Type:</strong> ${course.type.toUpperCase()}</p>
            <p><strong>Price:</strong> $${course.price}</p>

            ${course.type !== 'premium' ? `
                <button class="btn btn-success" onclick="claimFreeCourse(${course.id})">
                    Claim Free Course
                </button>
            ` : ''}

            ${course.type === 'premium' ? `
                <button class="btn btn-primary" onclick="redirectToPayment()">
                    Purchase Premium ($${course.price})
                </button>
            ` : ''}
        </div>
    `).join('');
    
    document.getElementById('courses-list').innerHTML = coursesHtml;
} catch (error) {
    showMessage('Error loading courses', 'error');
}

        }

        async function claimFreeCourse(courseId) {
            try {
                const response = await fetch('/api/claim-courses-free', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ course_id: courseId })
                });

                const data = await response.json();
                if (response.ok) {
                    showMessage(data.message);
                    // Refresh purchases after claiming
                    if (currentUser) {
                        loadMyPurchases();
                    }
                } else {
                    showMessage(data.error, 'error');
                }
            } catch (error) {
                showMessage('Network error', 'error');
            }
        }

        function redirectToPayment() {
            window.location.href = 'payment.html';
        }

        async function loadMyPurchases() {
            try {
                const response = await fetch('/api/profile');
                const profile = await response.json();
                
                console.log('Profile data:', profile); // Debug log
                
                // Load user details
                document.getElementById('user-username').textContent = profile.username;
                document.getElementById('user-badge').textContent = profile.badgeId;
                document.getElementById('user-type').textContent = profile.audienceType.toUpperCase();
                
                // Check if enrolledCourses exists and has data
                console.log('Enrolled courses:', profile.enrolledCourses); // Debug log
                
                if (profile.enrolledCourses && profile.enrolledCourses.length > 0) {
                    // If enrolledCourses contains course objects directly
                    if (typeof profile.enrolledCourses[0] === 'object') {
                        const purchasedHtml = profile.enrolledCourses.map(course => `
                            <div class="course-card ${course.type}">
                                <h4>${course.title}</h4>
                                <p><strong>ID:</strong> ${course.id}</p>
                                <p><strong>Type:</strong> ${course.type.toUpperCase()}</p>
                                <p><strong>Price:</strong> $${course.price}</p>
                                <p>✅ <strong>Purchased</strong></p>
                            </div>
                        `).join('');
                        document.getElementById('purchased-courses').innerHTML = purchasedHtml;
                    } else {
                        // If enrolledCourses contains course IDs, fetch course details
                        const coursesResponse = await fetch('/api/courses');
                        const allCourses = await coursesResponse.json();
                        
                        const purchasedHtml = profile.enrolledCourses.map(courseId => {
                            const course = allCourses.find(c => c.id === courseId);
                            return course ? `
                                <div class="course-card ${course.type}">
                                    <h4>${course.title}</h4>
                                    <p><strong>ID:</strong> ${course.id}</p>
                                    <p><strong>Type:</strong> ${course.type.toUpperCase()}</p>
                                    <p><strong>Price:</strong> $${course.price}</p>
                                    <p>✅ <strong>Purchased</strong></p>
                                </div>
                            ` : '';
                        }).join('');
                        
                        document.getElementById('purchased-courses').innerHTML = purchasedHtml;
                    }
                } else {
                    document.getElementById('purchased-courses').innerHTML = '<p>No courses purchased yet. <a href="#" onclick="showDashboard()">Browse courses</a></p>';
                }
            } catch (error) {
                showMessage('Error loading purchases', 'error');
                console.error('Profile error:', error);
            }
        }

        async function loadAdminPanel() {
            try {
                const response = await fetch('/api/admin/orders');
                const orders = await response.json();
                
                const ordersHtml = orders.map(order => `
                    <div class="course-card">
                        <h4>User: ${order.username}</h4>
                        <p><strong>Type:</strong> ${order.audienceType}</p>
                        <p><strong>Badge ID:</strong> ${order.badgeId}</p>
                        <p><strong>Enrolled Courses:</strong></p>
                        <ul>
                            ${order.enrolledCourses.map(course => 
                                `<li>${course.title} (ID: ${course.id}) - ${course.type}</li>`
                            ).join('')}
                        </ul>
                    </div>
                `).join('');
                
                document.getElementById('admin-orders').innerHTML = ordersHtml;
                document.getElementById('admin-panel').classList.remove('hidden');
            } catch (error) {
                showMessage('Error loading admin panel', 'error');
            }
        }

        async function loadCoursesForVoucher() {
            try {
                const response = await fetch('/api/courses');
                const courses = await response.json();
                
                const courseOptions = courses.map(course => 
                    `<option value="${course.id}">${course.title} (${course.type.toUpperCase()}) - $${course.price}</option>`
                ).join('');
                document.getElementById('voucher-course-select').innerHTML = 
                    '<option value="">Select Course</option>' + courseOptions;
            } catch (error) {
                showMessage('Error loading courses', 'error');
            }
        }

        async function generateVoucher() {
            const courseId = document.getElementById('voucher-course-select').value;
            if (!courseId) {
                showMessage('Please select a course', 'error');
                return;
            }

            try {
                const response = await fetch('/api/admin/generate-voucher', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ courseId: parseInt(courseId) })
                });

                const data = await response.json();
                if (response.ok) {
                    showMessage(`Voucher generated: ${data.voucher.code}`);
                    document.getElementById('voucher-course-select').value = '';
                } else {
                    showMessage(data.error, 'error');
                }
            } catch (error) {
                showMessage('Network error', 'error');
            }
        }

        async function loadVoucherHistory() {
            try {
                const response = await fetch('/api/admin/vouchers');
                const vouchers = await response.json();
                
                const vouchersHtml = vouchers.map(voucher => `
                    <div class="course-card">
                        <h4>Code: ${voucher.code}</h4>
                        <p><strong>Course:</strong> ${voucher.courseTitle} (ID: ${voucher.courseId})</p>
                        <p><strong>Status:</strong> ${voucher.isUsed ? '🔴 USED' : '🟢 AVAILABLE'}</p>
                        ${voucher.isUsed ? `
                            <p><strong>Used By:</strong> ${voucher.usedBy}</p>
                            <p><strong>Used At:</strong> ${new Date(voucher.usedAt).toLocaleString()}</p>
                        ` : ''}
                        <p><strong>Created:</strong> ${new Date(voucher.createdAt).toLocaleString()}</p>
                    </div>
                `).join('') || '<p>No vouchers generated yet.</p>';
                
                document.getElementById('vouchers-list').innerHTML = vouchersHtml;
            } catch (error) {
                showMessage('Error loading voucher history', 'error');
            }
        }

        async function redeemVoucher() {
            const voucherCode = document.getElementById('voucher-code').value;
            if (!voucherCode) {
                showMessage('Please enter voucher code', 'error');
                return;
            }

            try {
                const response = await fetch('/api/redeem-voucher', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ voucherCode })
                });

                const data = await response.json();
                if (response.ok) {
                    showMessage(data.message);
                    document.getElementById('voucher-code').value = '';
                    loadMyPurchases();
                } else {
                    showMessage(data.error, 'error');
                }
            } catch (error) {
                showMessage('Network error', 'error');
            }
        }

        async function loadCoursesManagement() {
            try {
                const response = await fetch('/api/courses');
                const courses = await response.json();
                
                const coursesHtml = courses.map(course => `
                    <div class="course-card ${course.type}">
                        <h4>${course.title}</h4>
                        <p><strong>ID:</strong> ${course.id}</p>
                        <p><strong>Type:</strong> ${course.type.toUpperCase()}</p>
                        <p><strong>Price:</strong> $${course.price}</p>
                        <button class="btn btn-danger" onclick="deleteCourse(${course.id})">Delete</button>
                    </div>
                `).join('');
                
                document.getElementById('courses-management-list').innerHTML = coursesHtml;
            } catch (error) {
                showMessage('Error loading courses', 'error');
            }
        }

        async function addCourse() {
            const title = document.getElementById('course-title').value;
            const type = document.getElementById('course-type').value;
            const price = document.getElementById('course-price').value || 0;

            if (!title) {
                showMessage('Please enter course title', 'error');
                return;
            }

            try {
                const response = await fetch('/api/admin/add-course', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, type, price: parseInt(price) })
                });

                const data = await response.json();
                if (response.ok) {
                    showMessage(`Course added: ${data.course.title} (ID: ${data.course.id})`);
                    document.getElementById('course-title').value = '';
                    document.getElementById('course-price').value = '';
                    loadCoursesManagement();
                } else {
                    showMessage(data.error, 'error');
                }
            } catch (error) {
                showMessage('Network error', 'error');
            }
        }

        async function deleteCourse(courseId) {
            if (!confirm('Are you sure you want to delete this course?')) return;

            try {
                const response = await fetch('/api/admin/delete-course', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ courseId })
                });

                const data = await response.json();
                if (response.ok) {
                    showMessage('Course deleted successfully');
                    loadCoursesManagement();
                } else {
                    showMessage(data.error, 'error');
                }
            } catch (error) {
                showMessage('Network error', 'error');
            }
        }

        async function logout() {
            try {
                // Call server logout to clear cookies
                await fetch('/api/logout', { method: 'POST' });
                
                // Clear cookies from client side
                document.cookie = 'AudienceType=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                document.cookie = 'badgeid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                document.cookie = 'authid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                
                // Reset UI
                currentUser = null;
                updateNavbar();
                showLanding();
                showMessage('Logged out successfully');
            } catch (error) {
                // Force logout even if server call fails
                currentUser = null;
                updateNavbar();
                showLanding();
            }
        }

        // Check if user is already logged in
        async function checkAuthStatus() {
            try {
                const response = await fetch('/api/profile');
                if (response.ok) {
                    const profile = await response.json();
                    currentUser = { username: profile.username, audienceType: profile.audienceType };
                    showDashboard();
                    loadCourses();
                    if (currentUser.audienceType === 'internal') {
                        loadAdminPanel();
                    }
                } else {
                    showLanding();
                }
            } catch (error) {
                showLanding();
            }
        }

        async function loadFeaturedCourses() {
            try {
                const response = await fetch('/api/courses');
                const courses = await response.json();
                
                const featuredCoursesDiv = document.getElementById('featured-courses');
                featuredCoursesDiv.innerHTML = '';
                
                // Show first 3 courses as featured
                courses.slice(0, 3).forEach(course => {
                    const courseCard = document.createElement('div');
                    courseCard.className = `course-card ${course.type}`;
                    courseCard.innerHTML = `
                        <h4>${course.title}</h4>
                        <p><strong>Type:</strong> ${course.type}</p>
                        <p><strong>Price:</strong> ${course.type === 'free' ? 'Free' : '$' + course.price}</p>
                        <button class="btn btn-primary" onclick="showSignup()">Enroll Now</button>
                    `;
                    featuredCoursesDiv.appendChild(courseCard);
                });
            } catch (error) {
                console.error('Error loading featured courses:', error);
            }
        }

        checkAuthStatus();
