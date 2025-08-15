import { Header } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero-section"
import { DashboardPreview } from "@/components/landing/dashboard-preview"
import { SocialProof } from "@/components/landing/social-proof"
import { ProblemSection } from "@/components/landing/problem-section"
import { BentoSection } from "@/components/landing/bento-section"
import { UseCasesSection } from "@/components/landing/use-cases-section"
import { LargeTestimonial } from "@/components/landing/large-testimonial"
import { PricingSection } from "@/components/landing/pricing-section"
import { TestimonialGridSection } from "@/components/landing/testimonial-grid-section"
import { FAQSection } from "@/components/landing/faq-section"
import { CTASection } from "@/components/landing/cta-section"
import { FooterSection } from "@/components/landing/footer-section"
import { AnimatedSection } from "@/components/landing/animated-section"
import { ChatbotPopup } from "@/components/chatbot-popup"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-0">
      {/* Fixed Header */}
      <Header />
      
      <div className="relative z-10 pt-16">
        <main className="max-w-[1320px] mx-auto relative">
          <HeroSection />
          {/* Dashboard Preview Wrapper - Positioned lower to avoid overlapping */}
          <div className="absolute bottom-[-250px] md:bottom-[-500px] left-1/2 transform -translate-x-1/2 z-30">
            <AnimatedSection>
              <DashboardPreview />
            </AnimatedSection>
          </div>
        </main>
        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto px-6 mt-[511px] md:mt-[500px]" delay={0.1}>
          <SocialProof />
        </AnimatedSection>
        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16" delay={0.15}>
          <ProblemSection />
        </AnimatedSection>
        <AnimatedSection id="features-section" className="relative z-10 max-w-[1320px] mx-auto mt-16" delay={0.2}>
          <BentoSection />
        </AnimatedSection>
        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16" delay={0.25}>
          <UseCasesSection />
        </AnimatedSection>
        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16" delay={0.2}>
          <LargeTestimonial />
        </AnimatedSection>
        <AnimatedSection
          id="pricing-section"
          className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16"
          delay={0.2}
        >
          <PricingSection />
        </AnimatedSection>
        <AnimatedSection
          id="testimonials-section"
          className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16"
          delay={0.2}
        >
          <TestimonialGridSection />
        </AnimatedSection>
        <AnimatedSection id="faq-section" className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16" delay={0.2}>
          <FAQSection />
        </AnimatedSection>
        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16" delay={0.2}>
          <CTASection />
        </AnimatedSection>
        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto mt-8 md:mt-16" delay={0.2}>
          <FooterSection />
        </AnimatedSection>
      </div>
      
      {/* Chatbot Popup */}
      <ChatbotPopup />
    </div>
  )
}