'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import info from '@/info.json';


const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

const Page = styled.div`
  min-height: 100vh;
  background-color: #f7f5f0;
  background-image: url('/bg-texture.png');
  background-repeat: repeat;
  background-size: 100px 100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 6rem 8vw;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
  max-width: 1200px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;


const Headline = styled.h1`
  font-family: var(--font-playfair), Georgia, serif;
  font-size: clamp(2rem, 3.5vw, 3rem);
  font-weight: 400;
  line-height: 1.1;
  color: #1a1a18;
  letter-spacing: -0.02em;
  text-align: center;

  em {
    font-style: italic;
  }
`;

const Body = styled.p`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: clamp(0.85rem, 1.2vw, 1rem);
  line-height: 1.65;
  color: #3a3a36;
  max-width: 38ch;
  text-align: center;
`;

const CTARow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
`;

const PrimaryButton = styled(Link)`
  display: inline-block;
  padding: 0.65rem 1.5rem;
  background: #1a1a18;
  color: #f2ede4;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.88rem;
  letter-spacing: 0.01em;
  border-radius: 4px;
  transition-property: background, scale;
  transition-duration: 0.15s;
  transition-timing-function: ease;

  &:hover {
    background: #333330;
  }
  &:active {
    scale: 0.96;
  }
`;

const SecondaryButton = styled(Link)`
  display: inline-block;
  padding: 0.65rem 1.5rem;
  background: transparent;
  color: #1a1a18;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.88rem;
  letter-spacing: 0.01em;
  border: 1.5px solid #1a1a18;
  border-radius: 4px;
  transition-property: background, scale;
  transition-duration: 0.15s;
  transition-timing-function: ease;

  &:hover {
    background: rgba(26, 26, 24, 0.06);
  }
  &:active {
    scale: 0.96;
  }
`;

const Specs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem 2rem;
  padding-top: 1rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(to right, rgba(26, 26, 24, 0.08), rgba(26, 26, 24, 0.12), rgba(26, 26, 24, 0.04));
    box-shadow: 0 1px 2px rgba(26, 26, 24, 0.04);
  }
`;

const Spec = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
`;

const SpecLabel = styled.span`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #888880;
`;

const SpecValue = styled.span`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.85rem;
  color: #1a1a18;
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

const Footer = styled.footer`
  text-align: center;
  margin-top: auto;
  padding-top: 4rem;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.72rem;
  color: rgba(26, 26, 24, 0.32);

  a {
    color: rgba(26, 26, 24, 0.45);
    text-decoration: underline;
    text-underline-offset: 2px;
    &:hover { color: #1a1a18; }
  }
`;

const DemoVideo = styled.video`
  width: 50vw;
  border-radius: 8px;
  box-shadow: 0 32px 80px rgba(26, 26, 24, 0.2);
`;

export default function Home() {
  const { title: bookTitle, blurb } = info;

  return (
    <Page>
      <Layout>
        <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <motion.div variants={fadeUp}>
            <Headline>
              <em>{bookTitle}</em>
            </Headline>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Body>{blurb}</Body>
          </motion.div>

          <motion.div variants={fadeUp}>
            <CTARow>
              <PrimaryButton href="/read">Start Reading</PrimaryButton>
              <SecondaryButton href="/admin">Author Dashboard</SecondaryButton>
            </CTARow>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Specs>
              <Spec>
                <SpecLabel>Feedback</SpecLabel>
                <SpecValue>Word-level precision</SpecValue>
              </Spec>
              <Spec>
                <SpecLabel>Versions</SpecLabel>
                <SpecValue>Git-backed history</SpecValue>
              </Spec>
              <Spec>
                <SpecLabel>Reactions</SpecLabel>
                <SpecValue>Likes & inline edits</SpecValue>
              </Spec>
              <Spec>
                <SpecLabel>Interface</SpecLabel>
                <SpecValue>Distraction-free</SpecValue>
              </Spec>
            </Specs>

                  <Footer>
        an <a href="https://github.com/divyavenn/inklink" target="_blank" rel="noopener noreferrer">open source tool</a> built by <a href="https://divyavenn.com/" target="_blank" rel="noopener noreferrer">divya venn</a>.
            </Footer>
          </motion.div>
        </motion.div>

        <Right>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <DemoVideo autoPlay muted loop playsInline>
              <source src="/inklink_overview.mp4" type="video/mp4" />
            </DemoVideo>
          </motion.div>
        </Right>
      </Layout>
    </Page>
  );
}
