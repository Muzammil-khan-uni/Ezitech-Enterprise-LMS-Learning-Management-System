import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Route as RouteIcon,
  BookMarked,
  Award,
  BarChart3,
  PlusCircle,
  MessagesSquare,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import ProtectedRoute from './ProtectedRoute';
import ShellLayout from './ShellLayout';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { Card } from '@/components/ui';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const SetPasswordPage = lazy(() => import('@/features/auth/pages/SetPasswordPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));
const ProfilePage = lazy(() => import('@/features/users/pages/ProfilePage'));
const CourseListPage = lazy(() => import('@/features/courses/pages/CourseListPage'));
const CourseDetailPage = lazy(() => import('@/features/courses/pages/CourseDetailPage'));
const CourseCreatePage = lazy(() => import('@/features/courses/pages/CourseCreatePage'));
const CourseBuilderPage = lazy(() => import('@/features/courses/pages/CourseBuilderPage'));
const AssessmentManagePage = lazy(() => import('@/features/assessments/pages/AssessmentManagePage'));
const AssessmentFormPage = lazy(() => import('@/features/assessments/pages/AssessmentFormPage'));
const LearningPathsPage = lazy(() => import('@/features/learning-paths/pages/LearningPathsPage'));
const MyLearningPage = lazy(() => import('@/features/enrollments/pages/MyLearningPage'));
const CourseAssessmentsPage = lazy(() => import('@/features/assessments/pages/CourseAssessmentsPage'));
const QuizTakingPage = lazy(() => import('@/features/assessments/pages/QuizTakingPage'));
const SubmissionPage = lazy(() => import('@/features/assessments/pages/SubmissionPage'));
const GradingPage = lazy(() => import('@/features/assessments/pages/GradingPage'));
const MyCertificatesPage = lazy(() => import('@/features/certificates/pages/MyCertificatesPage'));
const VerifyCertificatePage = lazy(() => import('@/features/certificates/pages/VerifyCertificatePage'));
const CourseDiscussionPage = lazy(() => import('@/features/discussions/pages/CourseDiscussionPage'));
const ThreadDetailPage = lazy(() => import('@/features/discussions/pages/ThreadDetailPage'));
const StudentDashboardPage = lazy(() => import('@/features/dashboards/pages/StudentDashboardPage'));
const InstructorDashboardPage = lazy(() => import('@/features/dashboards/pages/InstructorDashboardPage'));
const MentorDashboardPage = lazy(() => import('@/features/dashboards/pages/MentorDashboardPage'));
const MentorCourseAssessmentsPage = lazy(() => import('@/features/assessments/pages/MentorCourseAssessmentsPage'));
const AdminDashboardPage = lazy(() => import('@/features/dashboards/pages/AdminDashboardPage'));
const SubscriptionPlansPage = lazy(() => import('@/features/subscriptions/pages/SubscriptionPlansPage'));
const LiveClassListPage = lazy(() => import('@/features/live-classes/pages/LiveClassListPage'));
const LiveClassRoomPage = lazy(() => import('@/features/live-classes/pages/LiveClassRoomPage'));
const ScormPlayerPage = lazy(() => import('@/features/scorm/pages/ScormPlayerPage'));
const SecurityPage = lazy(() => import('@/features/auth/pages/SecurityPage'));
const CategoryManagementPage = lazy(() => import('@/features/courses/pages/CategoryManagementPage'));
const LearningPathManagePage = lazy(() => import('@/features/learning-paths/pages/LearningPathManagePage'));
const AdminUsersPage = lazy(() => import('@/features/users/pages/AdminUsersPage'));
const CouponsAdminPage = lazy(() => import('@/features/coupons/pages/CouponsAdminPage'));
const PlansAdminPage = lazy(() => import('@/features/subscriptions/pages/PlansAdminPage'));
const CertificateTemplatesAdminPage = lazy(
  () => import('@/features/certificate-templates/pages/CertificateTemplatesAdminPage')
);
const LearningStatisticsPage = lazy(() => import('@/features/dashboards/pages/LearningStatisticsPage'));
const FeedbackReportsPage = lazy(() => import('@/features/reviews/pages/FeedbackReportsPage'));

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        className="text-brand-500"
      >
        <Loader2 className="size-7" />
      </motion.div>
    </div>
  );
}

function HomePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  useNotificationSocket();
  const canCreateCourses = user && ['instructor', 'course_manager', 'admin'].includes(user.role);

  const dashboardPath =
    user?.role === 'admin'
      ? '/dashboard/admin'
      : user?.role === 'mentor'
        ? '/dashboard/mentor'
        : ['instructor', 'course_manager'].includes(user?.role || '')
          ? '/dashboard/instructor'
          : '/dashboard/student';

  const quickLinks = [
    { to: dashboardPath, label: t('nav.dashboard'), desc: t('home.dashboardDesc'), icon: <BarChart3 className="size-5" /> },
    { to: '/courses', label: t('nav.browseCourses'), desc: t('home.browseCoursesDesc'), icon: <GraduationCap className="size-5" /> },
    { to: '/learning-paths', label: t('nav.learningPaths'), desc: t('home.learningPathsDesc'), icon: <RouteIcon className="size-5" /> },
    { to: '/my-learning', label: t('nav.myLearning'), desc: t('home.myLearningDesc'), icon: <BookMarked className="size-5" /> },
    { to: '/my-certificates', label: t('nav.myCertificates'), desc: t('home.myCertificatesDesc'), icon: <Award className="size-5" /> },
  ];

  if (canCreateCourses) {
    quickLinks.push({ to: '/instructor/courses/new', label: t('nav.createCourse'), desc: t('home.createCourseDesc'), icon: <PlusCircle className="size-5" /> });
    quickLinks.push({ to: '/feedback-reports', label: t('nav.feedbackReports'), desc: t('home.feedbackReportsDesc'), icon: <MessagesSquare className="size-5" /> });
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="bg-gradient-brand relative overflow-hidden rounded-2xl px-6 py-8 text-white shadow-lift sm:px-8"
      >
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] [background-size:26px_26px]" />
        <motion.div
          className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-2xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <p className="relative z-10 text-sm font-medium text-white/75">
          {t('common.signedInAs')} {user?.name}
        </p>
        <h1 className="font-display relative z-10 mt-1 text-2xl font-extrabold sm:text-3xl">{t('home.welcomeBack')}</h1>
        <p className="relative z-10 mt-2 max-w-lg text-sm text-white/80">{t('home.subtitle')}</p>
      </motion.div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06 * i }}
          >
            <Link to={item.to}>
              <Card hoverLift className="group flex h-full items-start gap-4 p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 font-display font-bold text-ink-900">
                    {item.label}
                    <ArrowUpRight className="size-3.5 text-ink-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-500" />
                  </div>
                  <p className="mt-0.5 text-sm text-ink-500">{item.desc}</p>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function AppRoutes() {
  const { isBootstrapping } = useSessionBootstrap();

  if (isBootstrapping) {
    return <RouteLoadingFallback />;
  }

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route path="/courses" element={<CourseListPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/learning-paths" element={<LearningPathsPage />} />
        <Route path="/plans" element={<SubscriptionPlansPage />} />
        <Route path="/verify-certificate/:code" element={<VerifyCertificatePage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/quizzes/:assessmentId" element={<QuizTakingPage />} />
          <Route path="/submissions/:assessmentId" element={<SubmissionPage />} />
          <Route path="/live-classes/:sessionId/room" element={<LiveClassRoomPage />} />
          <Route path="/scorm/:courseId/:lessonId" element={<ScormPlayerPage />} />

          <Route element={<ShellLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/my-learning" element={<MyLearningPage />} />
            <Route path="/my-certificates" element={<MyCertificatesPage />} />
            <Route path="/courses/:courseId/assessments" element={<CourseAssessmentsPage />} />
            <Route path="/courses/:courseId/discussion" element={<CourseDiscussionPage />} />
            <Route path="/threads/:threadId" element={<ThreadDetailPage />} />
            <Route path="/dashboard/student" element={<StudentDashboardPage />} />
            <Route path="/statistics" element={<LearningStatisticsPage />} />
            <Route path="/courses/:courseId/live-classes" element={<LiveClassListPage />} />
            <Route path="/security" element={<SecurityPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['instructor', 'course_manager', 'admin', 'mentor']} />}>
          <Route element={<ShellLayout />}>
            <Route path="/grading/:assessmentId" element={<GradingPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['instructor', 'course_manager', 'admin']} />}>
          <Route element={<ShellLayout />}>
            <Route path="/dashboard/instructor" element={<InstructorDashboardPage />} />
            <Route path="/feedback-reports" element={<FeedbackReportsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['mentor']} />}>
          <Route element={<ShellLayout />}>
            <Route path="/dashboard/mentor" element={<MentorDashboardPage />} />
            <Route path="/mentor/courses/:courseId/assessments" element={<MentorCourseAssessmentsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<ShellLayout />}>
            <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/coupons" element={<CouponsAdminPage />} />
            <Route path="/admin/plans" element={<PlansAdminPage />} />
            <Route path="/admin/certificate-templates" element={<CertificateTemplatesAdminPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['course_manager', 'admin']} />}>
          <Route element={<ShellLayout />}>
            <Route path="/admin/categories" element={<CategoryManagementPage />} />
            <Route path="/admin/learning-paths" element={<LearningPathManagePage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['instructor', 'course_manager', 'admin']} />}>
          <Route element={<ShellLayout />}>
            <Route path="/instructor/courses/new" element={<CourseCreatePage />} />
            <Route path="/instructor/courses/:courseId/edit" element={<CourseBuilderPage />} />
            <Route path="/instructor/courses/:courseId/assessments" element={<AssessmentManagePage />} />
            <Route path="/instructor/courses/:courseId/assessments/new" element={<AssessmentFormPage />} />
            <Route path="/instructor/assessments/:assessmentId/edit" element={<AssessmentFormPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
